# OrderFlow — Limit Order Book & Market Microstructure Execution Simulator

A high-performance algorithmic trading simulator and market microstructure research engine implementing a continuous double-auction Limit Order Book (LOB) with price-time priority (FIFO), real-time Depth-of-Market (DOM) ladder visualization, Order Flow Imbalance (OFI) alpha signals, Volume-Synchronized Probability of Toxicity (VPIN), optimal execution scheduling (TWAP, VWAP, Almgren-Chriss), and statistical arbitrage spread backtesting.

---

## Architectural & Microstructure Modules

### 1. Continuous Double Auction LOB Engine
- **Matching Algorithm**: Price-Time Priority (FIFO) matching $O(1)$ order cancellation and execution.
- **Order Types**:
  - **Limit Orders**: Add liquidity to bids/asks queues.
  - **Market Orders**: Aggressively cross inside spread and execute against resting liquidity.
  - **Iceberg Orders**: Masks large institutional size, displaying a fractional peak and reloading from hidden inventory at queue tail upon exhaustion.
- **Depth-of-Market (DOM) Ladder**: Real-time Level-2 cumulative volume queues and tick-by-tick market depth.

### 2. High-Frequency Microstructure Signals
- **Order Flow Imbalance (OFI)** (Cont, Kukanov, Stoikov 2014):
  $$\text{OFI}_n = \Delta V_n^b - \Delta V_n^a$$
  Standardized indicator capturing net buying/selling pressure driving short-term quote revisions.
- **Micro-Price Estimator**:
  $$P_{\text{micro}} = \frac{V_b P_a + V_a P_b}{V_b + V_a}$$
  Adjusts the mid-price based on top-of-book depth skewness.
- **VPIN (Volume-Synchronized Probability of Toxicity)** (Easley, Lopez de Prado, O'Hara 2012):
  Measures order toxicity and adverse selection risk across equal volume buckets.

### 3. Algorithmic Execution Models
- **TWAP (Time-Weighted Average Price)**: Slices large parent orders across uniform time intervals.
- **VWAP (Volume-Weighted Average Price)**: Optimizes slice sizes along historical intraday U-shaped volume distributions.
- **Almgren-Chriss (2000) Optimal Liquidation**:
  Balances temporary market impact ($\eta$), permanent market impact ($\gamma$), and risk aversion ($\lambda\sigma^2$) to calculate optimal inventory trajectory $x_j$ and trading velocity $v_j$:
  $$x_j = X \frac{\sinh(\kappa (T - t_j))}{\sinh(\kappa T)}, \quad \kappa^2 \approx \frac{\lambda \sigma^2}{\eta}$$

### 4. Spread Trading & Statistical Arbitrage
- **Ornstein-Uhlenbeck (OU) Mean-Reversion**:
  $$dX_t = \theta (\mu - X_t) dt + \sigma dW_t$$
  - Measures spread half-life $\tau = \frac{\ln 2}{\theta}$.
  - Calibrated on transatlantic crude spreads (Brent vs WTI), calendar spreads, and Treasury yield curve spreads.
  - Generates dynamic Z-Score bands with customizable entry/exit bounds and tracks Sharpe ratio, Sortino ratio, and maximum drawdown.

---

## Getting Started

### Prerequisites
- Node.js (>= 18.x)
- npm (>= 9.x)

### Installation
```bash
# Clone repository
git clone https://github.com/TejdeepKodati/orderflow-engine.git
cd orderflow-engine

# Install dependencies
npm install
```

### Run Local Development Server
```bash
npm run dev
```

### Run Microstructure Test Suite
```bash
npm test
```

### Build Production Bundle
```bash
npm run build
```

---

## License
MIT License.
