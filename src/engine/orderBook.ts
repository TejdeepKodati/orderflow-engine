// High-Performance Limit Order Book (LOB) Engine
// Continuous Double-Auction matching engine with Price-Time Priority (FIFO)

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market' | 'iceberg';

export interface Order {
  id: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
  displayQuantity: number; // for iceberg orders
  hiddenQuantity: number;  // for iceberg orders
  timestamp: number;
}

export interface Trade {
  id: string;
  price: number;
  quantity: number;
  makerSide: OrderSide;
  timestamp: number;
}

export interface BookLevel {
  price: number;
  volume: number;
  orderCount: number;
  orders: Order[];
}

export interface DOMLevel {
  price: number;
  volume: number;
  cumulativeVolume: number;
  depthPct: number;
  orderCount: number;
}

export interface LOBState {
  bids: BookLevel[]; // Sorted descending (highest bid first)
  asks: BookLevel[]; // Sorted ascending (lowest ask first)
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  spreadBps: number | null;
  midPrice: number | null;
  trades: Trade[];
}

export class LimitOrderBook {
  private bids: Map<number, BookLevel> = new Map();
  private asks: Map<number, BookLevel> = new Map();
  private orders: Map<string, { order: Order; level: BookLevel }> = new Map();
  private trades: Trade[] = [];
  private orderCounter: number = 0;

  constructor(initialPrice: number = 100.0, tickSize: number = 0.05) {
    this.seedInitialBook(initialPrice, tickSize);
  }

  // Pre-seed book with realistic Level-2 market depth
  public seedInitialBook(centerPrice: number, tickSize: number) {
    this.bids.clear();
    this.asks.clear();
    this.orders.clear();
    this.trades = [];

    const levels = 8;
    for (let i = 1; i <= levels; i++) {
      const bidPrice = Math.round((centerPrice - i * tickSize) * 100) / 100;
      const askPrice = Math.round((centerPrice + i * tickSize) * 100) / 100;
      const bidQty = Math.floor(15 + Math.random() * 45);
      const askQty = Math.floor(15 + Math.random() * 45);

      this.submitLimitOrder('buy', bidPrice, bidQty);
      this.submitLimitOrder('sell', askPrice, askQty);
    }
  }

  public submitOrder(
    side: OrderSide,
    type: OrderType,
    price: number,
    quantity: number,
    displayQty?: number
  ): { executedQty: number; filledTrades: Trade[]; restingOrder: Order | null } {
    this.orderCounter++;
    const id = `ord-${this.orderCounter}-${Date.now().toString(36)}`;
    const now = Date.now();
    const filledTrades: Trade[] = [];

    let remaining = quantity;
    let disp = displayQty && displayQty < quantity ? displayQty : quantity;
    let hidden = quantity - disp;

    // Market Order Execution
    if (type === 'market') {
      const oppositeBook = side === 'buy' ? this.asks : this.bids;
      const sortedOpposite = this.getSortedLevels(side === 'buy' ? 'sell' : 'buy');

      for (const level of sortedOpposite) {
        if (remaining <= 0) break;

        const levelOrders = [...level.orders];
        for (const makerOrder of levelOrders) {
          if (remaining <= 0) break;

          const tradeQty = Math.min(remaining, makerOrder.remainingQuantity);
          remaining -= tradeQty;
          makerOrder.remainingQuantity -= tradeQty;
          level.volume -= tradeQty;

          const trade: Trade = {
            id: `trd-${this.trades.length + 1}`,
            price: level.price,
            quantity: tradeQty,
            makerSide: makerOrder.side,
            timestamp: now
          };
          filledTrades.push(trade);
          this.trades.unshift(trade);
          if (this.trades.length > 200) this.trades.pop();

          // If iceberg order needs reload
          if (makerOrder.type === 'iceberg' && makerOrder.remainingQuantity > 0) {
            makerOrder.displayQuantity = Math.min(makerOrder.displayQuantity, makerOrder.remainingQuantity);
          }

          if (makerOrder.remainingQuantity <= 0) {
            level.orders = level.orders.filter(o => o.id !== makerOrder.id);
            level.orderCount = level.orders.length;
            this.orders.delete(makerOrder.id);
          }
        }

        if (level.volume <= 0) {
          oppositeBook.delete(level.price);
        }
      }

      return {
        executedQty: quantity - remaining,
        filledTrades,
        restingOrder: null
      };
    }

    // Limit Order Matching
    const oppositeBook = side === 'buy' ? this.asks : this.bids;
    const sortedOpposite = this.getSortedLevels(side === 'buy' ? 'sell' : 'buy');

    for (const level of sortedOpposite) {
      if (remaining <= 0) break;
      const canCross = side === 'buy' ? price >= level.price : price <= level.price;
      if (!canCross) break;

      const levelOrders = [...level.orders];
      for (const makerOrder of levelOrders) {
        if (remaining <= 0) break;

        const tradeQty = Math.min(remaining, makerOrder.remainingQuantity);
        remaining -= tradeQty;
        makerOrder.remainingQuantity -= tradeQty;
        level.volume -= tradeQty;

        const trade: Trade = {
          id: `trd-${this.trades.length + 1}`,
          price: level.price,
          quantity: tradeQty,
          makerSide: makerOrder.side,
          timestamp: now
        };
        filledTrades.push(trade);
        this.trades.unshift(trade);
        if (this.trades.length > 200) this.trades.pop();

        if (makerOrder.remainingQuantity <= 0) {
          level.orders = level.orders.filter(o => o.id !== makerOrder.id);
          level.orderCount = level.orders.length;
          this.orders.delete(makerOrder.id);
        }
      }

      if (level.volume <= 0) {
        oppositeBook.delete(level.price);
      }
    }

    // Rest of order rests in book
    let resting: Order | null = null;
    if (remaining > 0) {
      const order: Order = {
        id,
        side,
        type,
        price,
        totalQuantity: quantity,
        remainingQuantity: remaining,
        displayQuantity: disp,
        hiddenQuantity: hidden,
        timestamp: now
      };

      const book = side === 'buy' ? this.bids : this.asks;
      let level = book.get(price);
      if (!level) {
        level = { price, volume: 0, orderCount: 0, orders: [] };
        book.set(price, level);
      }

      level.orders.push(order);
      level.volume += remaining;
      level.orderCount = level.orders.length;
      this.orders.set(id, { order, level });
      resting = order;
    }

    return {
      executedQty: quantity - remaining,
      filledTrades,
      restingOrder: resting
    };
  }

  public submitLimitOrder(side: OrderSide, price: number, quantity: number) {
    return this.submitOrder(side, 'limit', price, quantity);
  }

  public cancelOrder(orderId: string): boolean {
    const entry = this.orders.get(orderId);
    if (!entry) return false;

    const { order, level } = entry;
    level.volume -= order.remainingQuantity;
    level.orders = level.orders.filter(o => o.id !== orderId);
    level.orderCount = level.orders.length;

    if (level.volume <= 0) {
      if (order.side === 'buy') this.bids.delete(level.price);
      else this.asks.delete(level.price);
    }

    this.orders.delete(orderId);
    return true;
  }

  public getSortedLevels(side: OrderSide): BookLevel[] {
    const book = side === 'buy' ? this.bids : this.asks;
    const levels = Array.from(book.values()).filter(l => l.volume > 0);
    return levels.sort((a, b) => side === 'buy' ? b.price - a.price : a.price - b.price);
  }

  public getState(): LOBState {
    const sortedBids = this.getSortedLevels('buy');
    const sortedAsks = this.getSortedLevels('sell');

    const bestBid = sortedBids.length > 0 ? sortedBids[0].price : null;
    const bestAsk = sortedAsks.length > 0 ? sortedAsks[0].price : null;

    let spread: number | null = null;
    let spreadBps: number | null = null;
    let midPrice: number | null = null;

    if (bestBid !== null && bestAsk !== null) {
      spread = Math.round((bestAsk - bestBid) * 1000) / 1000;
      midPrice = Math.round(((bestBid + bestAsk) / 2) * 1000) / 1000;
      spreadBps = midPrice > 0 ? Math.round((spread / midPrice) * 10000 * 10) / 10 : null;
    }

    return {
      bids: sortedBids,
      asks: sortedAsks,
      bestBid,
      bestAsk,
      spread,
      spreadBps,
      midPrice,
      trades: this.trades
    };
  }

  public getDOMLadder(depthCount: number = 8): { bids: DOMLevel[]; asks: DOMLevel[] } {
    const sortedBids = this.getSortedLevels('buy').slice(0, depthCount);
    const sortedAsks = this.getSortedLevels('sell').slice(0, depthCount);

    let maxBidCum = 0;
    const bidDom: DOMLevel[] = [];
    let cumBid = 0;
    for (const b of sortedBids) {
      cumBid += b.volume;
      bidDom.push({
        price: b.price,
        volume: b.volume,
        cumulativeVolume: cumBid,
        depthPct: 0,
        orderCount: b.orderCount
      });
    }
    maxBidCum = cumBid || 1;
    bidDom.forEach(d => d.depthPct = Math.round((d.cumulativeVolume / maxBidCum) * 100));

    let maxAskCum = 0;
    const askDom: DOMLevel[] = [];
    let cumAsk = 0;
    for (const a of sortedAsks) {
      cumAsk += a.volume;
      askDom.push({
        price: a.price,
        volume: a.volume,
        cumulativeVolume: cumAsk,
        depthPct: 0,
        orderCount: a.orderCount
      });
    }
    maxAskCum = cumAsk || 1;
    askDom.forEach(d => d.depthPct = Math.round((d.cumulativeVolume / maxAskCum) * 100));

    return { bids: bidDom, asks: askDom };
  }
}
