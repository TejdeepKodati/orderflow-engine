// Market Microstructure Alpha Signals Engine
// Implements Order Flow Imbalance (OFI), Volume-Synchronized Probability of Toxicity (VPIN), and Micro-Price

import { BookLevel, Trade } from './orderBook';

export interface OFISnapshot {
  timestamp: number;
  ofi: number;                 // Order Flow Imbalance
  cumulativeOFI: number;       // Running integrated OFI
  normalizedOFI: number;       // OFI normalized by total top-of-book volume [-1, 1]
  microPrice: number;          // Volume-weighted micro-price
  spreadElasticity: number;    // Order depth response to price revision
  vpin: number;                // Volume-synchronized toxicity metric [0, 1]
  predictedDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export class MicrostructureAnalyzer {
  private prevBestBidPrice: number | null = null;
  private prevBestBidVol: number = 0;
  private prevBestAskPrice: number | null = null;
  private prevBestAskVol: number = 0;
  private cumulativeOFI: number = 0;
  private volumeBuckets: { buyVol: number; sellVol: number; totalVol: number }[] = [];
  private currentBucket = { buyVol: 0, sellVol: 0, totalVol: 0 };
  private bucketSize: number = 200; // contracts per volume bucket

  // Update order flow state based on consecutive LOB states
  public update(bids: BookLevel[], asks: BookLevel[], recentTrades: Trade[]): OFISnapshot {
    const bestBid = bids.length > 0 ? bids[0] : null;
    const bestAsk = asks.length > 0 ? asks[0] : null;

    const currentBidP = bestBid ? bestBid.price : 0;
    const currentBidV = bestBid ? bestBid.volume : 0;
    const currentAskP = bestAsk ? bestAsk.price : 0;
    const currentAskV = bestAsk ? bestAsk.volume : 0;

    let deltaBidVol = 0;
    let deltaAskVol = 0;

    // Cont, Kukanov, Stoikov (2014) OFI Formulation:
    // If Bid Price increases: deltaV_bid = currentBidV
    // If Bid Price is unchanged: deltaV_bid = currentBidV - prevBidV
    // If Bid Price decreases: deltaV_bid = -prevBidV
    if (this.prevBestBidPrice !== null) {
      if (currentBidP > this.prevBestBidPrice) {
        deltaBidVol = currentBidV;
      } else if (currentBidP === this.prevBestBidPrice) {
        deltaBidVol = currentBidV - this.prevBestBidVol;
      } else {
        deltaBidVol = -this.prevBestBidVol;
      }
    }

    // Same for Ask Price:
    // If Ask Price increases: deltaV_ask = -prevAskV
    // If Ask Price is unchanged: deltaV_ask = currentAskV - prevAskV
    // If Ask Price decreases: deltaV_ask = currentAskV
    if (this.prevBestAskPrice !== null) {
      if (currentAskP < this.prevBestAskPrice) {
        deltaAskVol = currentAskV;
      } else if (currentAskP === this.prevBestAskPrice) {
        deltaAskVol = currentAskV - this.prevBestAskVol;
      } else {
        deltaAskVol = -this.prevBestAskVol;
      }
    }

    const ofi = deltaBidVol - deltaAskVol;
    this.cumulativeOFI += ofi;

    // Save previous
    this.prevBestBidPrice = currentBidP;
    this.prevBestBidVol = currentBidV;
    this.prevBestAskPrice = currentAskP;
    this.prevBestAskVol = currentAskV;

    // Volume-Weighted Micro-Price: P_micro = (V_bid * P_ask + V_ask * P_bid) / (V_bid + V_ask)
    const totalTopVolume = currentBidV + currentAskV;
    const microPrice = totalTopVolume > 0
      ? (currentBidV * currentAskP + currentAskV * currentBidP) / totalTopVolume
      : (currentBidP + currentAskP) / 2;

    const normalizedOFI = totalTopVolume > 0
      ? Math.max(-1, Math.min(1, ofi / totalTopVolume))
      : 0;

    // VPIN calculation: Update trade buckets
    if (recentTrades.length > 0) {
      const latest = recentTrades[0];
      const isBuyerInitiated = latest.makerSide === 'sell';
      if (isBuyerInitiated) {
        this.currentBucket.buyVol += latest.quantity;
      } else {
        this.currentBucket.sellVol += latest.quantity;
      }
      this.currentBucket.totalVol += latest.quantity;

      if (this.currentBucket.totalVol >= this.bucketSize) {
        this.volumeBuckets.push({ ...this.currentBucket });
        if (this.volumeBuckets.length > 20) this.volumeBuckets.shift();
        this.currentBucket = { buyVol: 0, sellVol: 0, totalVol: 0 };
      }
    }

    // Calculate VPIN across active buckets
    let vpin = 0.22; // default baseline
    if (this.volumeBuckets.length > 5) {
      let sumImbalance = 0;
      let totalV = 0;
      for (const b of this.volumeBuckets) {
        sumImbalance += Math.abs(b.buyVol - b.sellVol);
        totalV += b.totalVol;
      }
      vpin = totalV > 0 ? sumImbalance / totalV : 0.22;
    }

    // Spread elasticity: sensitivity of queue replenishment
    const spreadElasticity = totalTopVolume > 0 ? Math.abs(ofi) / totalTopVolume : 0;

    let predictedDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (normalizedOFI > 0.25) predictedDirection = 'BULLISH';
    else if (normalizedOFI < -0.25) predictedDirection = 'BEARISH';

    return {
      timestamp: Date.now(),
      ofi,
      cumulativeOFI: this.cumulativeOFI,
      normalizedOFI: Math.round(normalizedOFI * 1000) / 1000,
      microPrice: Math.round(microPrice * 1000) / 1000,
      spreadElasticity: Math.round(spreadElasticity * 100) / 100,
      vpin: Math.round(vpin * 1000) / 1000,
      predictedDirection
    };
  }

  public reset() {
    this.prevBestBidPrice = null;
    this.prevBestBidVol = 0;
    this.prevBestAskPrice = null;
    this.prevBestAskVol = 0;
    this.cumulativeOFI = 0;
    this.volumeBuckets = [];
    this.currentBucket = { buyVol: 0, sellVol: 0, totalVol: 0 };
  }
}
