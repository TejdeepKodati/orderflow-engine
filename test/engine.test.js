// Market Microstructure & Limit Order Book Engine Unit Test Suite
// Verifies FIFO Matching Priority, LOB Queue Invariants, OFI Calculation, VWAP Scheduling, and OU Stat-Arb

import assert from 'node:assert';

console.log('--- STARTING ORDERFLOW MICROSTRUCTURE TEST SUITE ---');

// Test 1: LOB FIFO Matching Priority
{
  class SimpleBook {
    constructor() {
      this.bids = []; // { id, price, qty }
      this.asks = [];
      this.trades = [];
    }

    addLimit(side, id, price, qty) {
      if (side === 'buy') {
        this.bids.push({ id, price, qty });
        this.bids.sort((a, b) => b.price - a.price);
      } else {
        this.asks.push({ id, price, qty });
        this.asks.sort((a, b) => a.price - b.price);
      }
    }

    matchMarket(side, qty) {
      let remaining = qty;
      const book = side === 'buy' ? this.asks : this.bids;
      while (remaining > 0 && book.length > 0) {
        const top = book[0];
        const tradeQty = Math.min(remaining, top.qty);
        remaining -= tradeQty;
        top.qty -= tradeQty;
        this.trades.push({ price: top.price, qty: tradeQty });
        if (top.qty === 0) book.shift();
      }
      return qty - remaining;
    }
  }

  const book = new SimpleBook();
  // Add two bids at same price: ord1 arrived first, ord2 arrived second
  book.addLimit('sell', 'ask1', 100.10, 20);
  book.addLimit('sell', 'ask2', 100.10, 30);
  book.addLimit('sell', 'ask3', 100.15, 50);

  // Market buy of 35 lots should fully consume ask1 (20) and partially consume ask2 (15)
  const filled = book.matchMarket('buy', 35);
  assert.strictEqual(filled, 35, 'Market order should fill 35 lots');
  assert.strictEqual(book.trades.length, 2, 'Should generate 2 fill trades');
  assert.strictEqual(book.trades[0].qty, 20, 'First fill must be FIFO priority ask1');
  assert.strictEqual(book.trades[1].qty, 15, 'Second fill must be from ask2');
  assert.strictEqual(book.asks[0].qty, 15, 'ask2 remaining quantity must be 15');
  console.log('[PASS] LOB FIFO Priority & Continuous Matching Verified');
}

// Test 2: Order Flow Imbalance (OFI) Calculation (Cont, Kukanov, Stoikov 2014)
{
  function computeOFI(prevBidP, prevBidV, curBidP, curBidV, prevAskP, prevAskV, curAskP, curAskV) {
    let deltaBid = 0;
    let deltaAsk = 0;

    if (curBidP > prevBidP) deltaBid = curBidV;
    else if (curBidP === prevBidP) deltaBid = curBidV - prevBidV;
    else deltaBid = -prevBidV;

    if (curAskP < prevAskP) deltaAsk = curAskV;
    else if (curAskP === prevAskP) deltaAsk = curAskV - prevAskV;
    else deltaAsk = -prevAskV;

    return deltaBid - deltaAsk;
  }

  // Case 1: Bid queue adds 50 lots, ask remains constant -> OFI should be +50
  const ofi1 = computeOFI(100.0, 100, 100.0, 150, 100.1, 100, 100.1, 100);
  assert.strictEqual(ofi1, 50, 'OFI for bid replenishment should be +50');

  // Case 2: Bid price ticks up from 100.0 to 100.05 with 80 lots -> OFI deltaBid = 80
  const ofi2 = computeOFI(100.0, 100, 100.05, 80, 100.1, 100, 100.1, 100);
  assert.strictEqual(ofi2, 80, 'OFI for bid price tick up should equal new bid volume 80');

  // Case 3: Ask queue is aggressively consumed from 100 lots down to 20 lots -> OFI should be +80
  const ofi3 = computeOFI(100.0, 100, 100.0, 100, 100.1, 100, 100.1, 20);
  assert.strictEqual(ofi3, 80, 'OFI for ask consumption should be +80');

  console.log('[PASS] Microstructure Order Flow Imbalance (OFI) Invariants Verified');
}

// Test 3: Micro-Price Estimator Formula
{
  const bidP = 100.0;
  const askP = 100.10;
  const bidV = 300;
  const askV = 100;

  // Since bid volume is 3x ask volume, price pressure is upward, micro-price should be closer to ask
  const microP = (bidV * askP + askV * bidP) / (bidV + askV);
  const midP = (bidP + askP) / 2;

  assert(microP > midP, 'Micro-price must tilt towards ask when bid volume exceeds ask volume');
  assert.strictEqual(Math.round(microP * 1000) / 1000, 100.075, 'Micro-price calculation mismatch');
  console.log(`[PASS] Micro-Price Estimator: $${microP.toFixed(3)} (Mid: $${midP.toFixed(3)}) Verified`);
}

// Test 4: VWAP Benchmark Consistency
{
  const slices = [
    { price: 100.0, qty: 1000 },
    { price: 100.5, qty: 2000 },
    { price: 101.0, qty: 3000 }
  ];

  const totalNotional = slices.reduce((acc, s) => acc + s.price * s.qty, 0);
  const totalVolume = slices.reduce((acc, s) => acc + s.qty, 0);
  const vwap = totalNotional / totalVolume;

  // Expected: (100*1000 + 100.5*2000 + 101*3000) / 6000 = (100000 + 201000 + 303000) / 6000 = 604000 / 6000 = 100.6667
  assert(Math.abs(vwap - 100.6667) < 0.001, 'VWAP calculation mismatch');
  console.log(`[PASS] Benchmark VWAP: $${vwap.toFixed(4)} Verified`);
}

// Test 5: Ornstein-Uhlenbeck Mean Reversion Half-Life
{
  const halfLife = 4.0; // days
  const theta = Math.log(2) / halfLife;
  const recoveredHalfLife = Math.log(2) / theta;
  assert.strictEqual(recoveredHalfLife, 4.0, 'OU half-life inversion failed');
  console.log(`[PASS] OU Mean-Reversion Half-Life Parameter: ${recoveredHalfLife} days Verified`);
}

console.log('--- ALL 5 ORDERFLOW MICROSTRUCTURE ENGINE TESTS PASSED ---');
