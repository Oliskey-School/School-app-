import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { TrendingUpIcon, TrendingDownIcon, DollarSignIcon, PieChartIcon, BriefcaseIcon, RefreshCwIcon, CalendarIcon } from 'lucide-react';

interface StockMarketGameProps {
    onBack: () => void;
}

interface Stock {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    history: number[];
    volatility: number; // 0-1, higher is riskier
    trend: number; // -1 to 1, simplified market sentiment
}

interface PortfolioItem {
    symbol: string;
    quantity: number;
    avgCost: number;
}

const INITIAL_STOCKS: Stock[] = [
    { symbol: 'TECH', name: 'FutureTech Inc.', sector: 'Technology', price: 150, history: [150], volatility: 0.05, trend: 0.1 },
    { symbol: 'NRGY', name: 'GreenPower Co.', sector: 'Energy', price: 80, history: [80], volatility: 0.08, trend: 0.05 },
    { symbol: 'FOOD', name: 'MegaMart', sector: 'Retail', price: 45, history: [45], volatility: 0.02, trend: 0.02 },
    { symbol: 'AUTO', name: 'E-Drive Motors', sector: 'Automotive', price: 210, history: [210], volatility: 0.12, trend: 0 },
];

const INITIAL_CASH = 10000;
const MAX_DAYS = 30;

const StockMarketGame: React.FC<StockMarketGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [cash, setCash] = useState(INITIAL_CASH);
    const [day, setDay] = useState(1);
    const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(INITIAL_STOCKS[0]);
    const [gameState, setGameState] = useState<'PLAYING' | 'COMPLETED'>('PLAYING');
    const [tradeQty, setTradeQty] = useState(1);

    // Helper to calculate total value
    const getPortfolioValue = () => {
        return portfolio.reduce((acc, item) => {
            const stock = stocks.find(s => s.symbol === item.symbol);
            return acc + (stock ? stock.price * item.quantity : 0);
        }, 0);
    };

    const getTotalNetWorth = () => cash + getPortfolioValue();

    // Advance Day / Turn
    const nextDay = () => {
        if (day >= MAX_DAYS) {
            endGame();
            return;
        }

        const newStocks = stocks.map(stock => {
            // Random walk with drift based on trend
            const changePercent = (Math.random() - 0.5) * stock.volatility * 2 + (stock.trend * 0.1);
            let newPrice = stock.price * (1 + changePercent);
            newPrice = Math.max(1, parseFloat(newPrice.toFixed(2))); // Ensure price > 0

            // Random events
            if (Math.random() < 0.05) { // 5% chance of major news
                const flashType = Math.random() > 0.5 ? 1 : -1;
                newPrice *= (1 + (0.15 * flashType)); // 15% jump or drop
            }

            return {
                ...stock,
                price: newPrice,
                history: [...stock.history, newPrice]
            };
        });

        setStocks(newStocks);
        setDay(prev => prev + 1);

        // Update selected stock ref
        if (selectedStock) {
            const updated = newStocks.find(s => s.symbol === selectedStock.symbol);
            if (updated) setSelectedStock(updated);
        }
    };

    const endGame = () => {
        setGameState('COMPLETED');
        const finalValue = getTotalNetWorth();
        const profit = finalValue - INITIAL_CASH;

        if (profit > 2000) {
            addXP(200);
            unlockBadge('wall-street-wiz');
            confetti();
        } else if (profit > 0) {
            addXP(100);
            confetti({ particleCount: 50 });
        }
    };

    const buyStock = () => {
        if (!selectedStock) return;
        const cost = selectedStock.price * tradeQty;
        if (cash >= cost) {
            setCash(prev => prev - cost);

            // Update portfolio
            const existingItem = portfolio.find(p => p.symbol === selectedStock.symbol);
            if (existingItem) {
                const totalCost = (existingItem.avgCost * existingItem.quantity) + cost;
                const newQty = existingItem.quantity + tradeQty;
                setPortfolio(prev => prev.map(p => p.symbol === selectedStock.symbol ? { ...p, quantity: newQty, avgCost: totalCost / newQty } : p));
            } else {
                setPortfolio(prev => [...prev, { symbol: selectedStock.symbol, quantity: tradeQty, avgCost: selectedStock.price }]);
            }
        }
    };

    const sellStock = () => {
        if (!selectedStock) return;
        const owned = portfolio.find(p => p.symbol === selectedStock.symbol);
        if (owned && owned.quantity >= tradeQty) {
            const revenue = selectedStock.price * tradeQty;
            setCash(prev => prev + revenue);

            if (owned.quantity === tradeQty) {
                setPortfolio(prev => prev.filter(p => p.symbol !== selectedStock.symbol));
            } else {
                setPortfolio(prev => prev.map(p => p.symbol === selectedStock.symbol ? { ...p, quantity: p.quantity - tradeQty } : p));
            }
        }
    };

    return (
        <GameShell
            title="Stock Market Simulator"
            onExit={onBack}
            score={Math.floor(getTotalNetWorth())}
            isGameOver={gameState === 'COMPLETED'}
            onRestart={() => {
                setCash(INITIAL_CASH);
                setDay(1);
                setStocks(INITIAL_STOCKS);
                setPortfolio([]);
                setGameState('PLAYING');
            }}
        >
            <div className="h-full w-full bg-slate-100 flex flex-col md:flex-row p-4 gap-4 overflow-hidden font-sans">

                {/* Sidebar: Market List & Portfolio */}
                <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto pr-1">
                    {/* Net Worth Card */}
                    <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-blue-600">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Net Worth</h3>
                        <div className="text-3xl font-black text-slate-800 flex items-center gap-1">
                            <DollarSignIcon className="text-green-600" size={24} />
                            {getTotalNetWorth().toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className={`text-sm font-bold ${getTotalNetWorth() >= INITIAL_CASH ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                            {getTotalNetWorth() >= INITIAL_CASH ? <TrendingUpIcon size={14} className="mr-1" /> : <TrendingDownIcon size={14} className="mr-1" />}
                            {((getTotalNetWorth() - INITIAL_CASH) / INITIAL_CASH * 100).toFixed(1)}% Return
                        </div>
                    </div>

                    {/* Stock List */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
                        <div className="bg-slate-50 p-3 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                            <span>Market</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Day {day}/{MAX_DAYS}</span>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {stocks.map(stock => {
                                const change = ((stock.price - stock.history[stock.history.length - 2] || stock.price) / (stock.history[stock.history.length - 2] || 1)) * 100;
                                return (
                                    <button
                                        key={stock.symbol}
                                        onClick={() => setSelectedStock(stock)}
                                        className={`w-full p-3 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors ${selectedStock?.symbol === stock.symbol ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                    >
                                        <div className="text-left">
                                            <div className="font-bold text-slate-800">{stock.symbol}</div>
                                            <div className="text-xs text-slate-500">{stock.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">${stock.price.toFixed(2)}</div>
                                            <div className={`text-xs font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={nextDay}
                        disabled={gameState === 'COMPLETED'}
                        className="bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-500 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                        <CalendarIcon size={20} />
                        {gameState === 'COMPLETED' ? 'Market Closed' : 'Next Day'}
                    </button>
                </div>

                {/* Main Panel: Analysis & Trading */}
                <div className="flex-1 bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden relative">
                    {selectedStock ? (
                        <>
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                        {selectedStock.name} <span className="text-lg text-slate-400 font-medium">({selectedStock.symbol})</span>
                                    </h2>
                                    <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded mt-1 font-bold">{selectedStock.sector}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-slate-800">${selectedStock.price.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* Chart Area (Simplified Visual) */}
                            <div className="flex-1 p-6 relative flex items-end gap-1 overflow-hidden border-b border-slate-100 bg-slate-50/50">
                                {selectedStock.history.map((price, i) => {
                                    const max = Math.max(...selectedStock.history, selectedStock.price * 1.2);
                                    const min = Math.min(...selectedStock.history, selectedStock.price * 0.8);
                                    const heightPercent = ((price - min) / (max - min)) * 80 + 10; // scale 10-90%
                                    return (
                                        <div
                                            key={i}
                                            className="flex-1 bg-blue-500 rounded-t-sm opacity-60 hover:opacity-100 transition-opacity relative group"
                                            style={{ height: `${heightPercent}%` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-xs px-1 rounded mb-1 whitespace-nowrap z-10">
                                                ${price.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Trading Controls */}
                            <div className="p-6 bg-white z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-slate-600 font-medium">
                                        Cash Available: <span className="font-bold text-slate-900">${cash.toFixed(2)}</span>
                                    </div>
                                    <div className="text-slate-600 font-medium">
                                        You Own: <span className="font-bold text-slate-900">{portfolio.find(p => p.symbol === selectedStock.symbol)?.quantity || 0} shares</span>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-center">
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                        <button onClick={() => setTradeQty(Math.max(1, tradeQty - 1))} className="w-8 h-8 flex items-center justify-center font-bold hover:bg-white rounded shadow-sm">-</button>
                                        <span className="w-12 text-center font-bold">{tradeQty}</span>
                                        <button onClick={() => setTradeQty(tradeQty + 1)} className="w-8 h-8 flex items-center justify-center font-bold hover:bg-white rounded shadow-sm">+</button>
                                    </div>
                                    <div className="text-sm font-bold text-slate-400">
                                        Total: ${(selectedStock.price * tradeQty).toFixed(2)}
                                    </div>

                                    <div className="ml-auto flex gap-2">
                                        <button
                                            onClick={buyStock}
                                            disabled={cash < selectedStock.price * tradeQty}
                                            className="bg-green-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-500 shadow-md transition-all active:scale-95"
                                        >
                                            Buy
                                        </button>
                                        <button
                                            onClick={sellStock}
                                            disabled={!portfolio.find(p => p.symbol === selectedStock.symbol) || (portfolio.find(p => p.symbol === selectedStock.symbol)?.quantity || 0) < tradeQty}
                                            className="bg-red-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-500 shadow-md transition-all active:scale-95"
                                        >
                                            Sell
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            Select a stock to view details
                        </div>
                    )}

                    {/* Game Over Overlay */}
                    {gameState === 'COMPLETED' && (
                        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-8 text-center z-50">
                            <PieChartIcon size={80} className="text-blue-400 mb-6" />
                            <h2 className="text-4xl font-black text-white mb-2">Market Closed</h2>
                            <p className="text-xl text-slate-300 mb-8">
                                Final Portfolio Value: <strong className="text-white">${getTotalNetWorth().toFixed(2)}</strong>
                            </p>
                            <div className="grid grid-cols-2 gap-8 text-left max-w-sm w-full mb-8">
                                <div>
                                    <div className="text-xs uppercase text-slate-500 font-bold">Initial Investment</div>
                                    <div className="text-xl font-bold text-white">${INITIAL_CASH}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase text-slate-500 font-bold">Profit/Loss</div>
                                    <div className={`text-xl font-bold ${getTotalNetWorth() - INITIAL_CASH >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${(getTotalNetWorth() - INITIAL_CASH).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => { setCash(INITIAL_CASH); setDay(1); setStocks(INITIAL_STOCKS); setPortfolio([]); setPortfolio([]); setGameState('PLAYING'); }}
                                className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-500 shadow-lg"
                            >
                                Start New Portfolio
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </GameShell>
    );
};

export default StockMarketGame;
