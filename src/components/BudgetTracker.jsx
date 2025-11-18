import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Target, Edit2, Check, X, Zap, Calendar, Filter, Download, Search, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ref, set, onValue } from 'firebase/database';
import { database } from '../firebase';

export default function BudgetTracker({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [bulkInput, setBulkInput] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [type, setType] = useState('pengeluaran');
  const [targets, setTargets] = useState([
    { id: 1, name: 'Ortu', target: 2000000, spent: 0, keywords: ['ortu', 'orang tua', 'orangtua'] },
    { id: 2, name: 'Tabungan', target: 1000000, spent: 0, keywords: ['tabungan', 'nabung', 'saving'] },
    { id: 3, name: 'Cicilan', target: 500000, spent: 0, keywords: ['cicilan', 'bayar cicilan'] }
  ]);
  const [editingTarget, setEditingTarget] = useState(null);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetAmount, setNewTargetAmount] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(true);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [chartWeekOffset, setChartWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAnimation, setShowAnimation] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories = {
    pengeluaran: ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Ortu', 'Tabungan', 'Cicilan', 'Lainnya'],
    pemasukan: ['Gaji', 'Bonus', 'Hadiah', 'Lainnya']
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

  // Load data from Firebase
  useEffect(() => {
    if (!user) return;

    const transactionsRef = ref(database, `users/${user.uid}/transactions`);
    const targetsRef = ref(database, `users/${user.uid}/targets`);

    const unsubTrans = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        setTransactions(data);
      } else if (data) {
        // Handle if data is object, convert to array
        setTransactions(Object.values(data));
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading transactions:', error);
      setIsLoading(false);
    });

    const unsubTargets = onValue(targetsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        setTargets(data);
      } else if (data) {
        setTargets(Object.values(data));
      }
    }, (error) => {
      console.error('Error loading targets:', error);
    });

    return () => {
      unsubTrans();
      unsubTargets();
    };
  }, [user]);

  // Save transactions to Firebase
  useEffect(() => {
    if (!isLoading && user && transactions.length >= 0) {
      set(ref(database, `users/${user.uid}/transactions`), transactions).catch((error) => {
        console.error('Error saving transactions:', error);
      });
    }
  }, [transactions, isLoading, user]);

  // Save targets to Firebase
  useEffect(() => {
    if (!isLoading && user && targets.length >= 0) {
      set(ref(database, `users/${user.uid}/targets`), targets).catch((error) => {
        console.error('Error saving targets:', error);
      });
    }
  }, [targets, isLoading, user]);

  // Check for budget alerts
  useEffect(() => {
    const newAlerts = [];
    targets.forEach(target => {
      const percentage = (target.spent / target.target) * 100;
      if (percentage >= 100) {
        newAlerts.push({
          type: 'danger',
          message: `⚠️ Target ${target.name} telah melewati budget! (${percentage.toFixed(0)}%)`
        });
      } else if (percentage >= 80) {
        newAlerts.push({
          type: 'warning',
          message: `⚡ Target ${target.name} sudah ${percentage.toFixed(0)}% dari budget`
        });
      }
    });
    setAlerts(newAlerts);
  }, [targets]);

  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
  };

  const filteredTransactions = transactions.filter(t => {
    let dateMatch = true;
    if (filterStartDate || filterEndDate) {
      const transDate = parseDate(t.date);
      const startDate = filterStartDate ? new Date(filterStartDate) : null;
      const endDate = filterEndDate ? new Date(filterEndDate) : null;

      if (startDate && endDate) {
        dateMatch = transDate >= startDate && transDate <= endDate;
      } else if (startDate) {
        dateMatch = transDate >= startDate;
      } else if (endDate) {
        dateMatch = transDate <= endDate;
      }
    }

    const searchMatch = searchQuery === '' || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    const categoryMatch = filterCategory === 'all' || t.category === filterCategory;

    return dateMatch && searchMatch && categoryMatch;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'pemasukan')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'pengeluaran')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const getPieChartData = () => {
    const categoryTotals = {};
    filteredTransactions
      .filter(t => t.type === 'pengeluaran')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value
    }));
  };

  useEffect(() => {
    const updatedTargets = targets.map(target => {
      const spent = transactions
        .filter(t => t.type === 'pengeluaran' && t.category === target.name)
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...target, spent };
    });
    setTargets(updatedTargets);
  }, [transactions]);

  const getWeeklyData = () => {
    const weekDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();
    const data = [];
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (chartWeekOffset * 7) - 6);

    let startDateStr = '';
    let endDateStr = '';

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toLocaleDateString('id-ID');
      const dayName = weekDays[date.getDay()];

      if (i === 0) startDateStr = dateStr;
      if (i === 6) endDateStr = dateStr;

      const dayIncome = transactions
        .filter(t => t.type === 'pemasukan' && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpense = transactions
        .filter(t => t.type === 'pengeluaran' && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        day: `${dayName}\n${date.getDate()}/${date.getMonth() + 1}`,
        Pemasukan: dayIncome,
        Pengeluaran: dayExpense
      });
    }

    return { data, startDateStr, endDateStr };
  };

  const parseAmount = (amountStr) => {
    const cleaned = amountStr.toLowerCase().replace(/\\s/g, '');

    if (cleaned.includes('k')) {
      return parseFloat(cleaned.replace('k', '')) * 1000;
    }
    if (cleaned.includes('jt') || cleaned.includes('juta')) {
      return parseFloat(cleaned.replace(/jt|juta/g, '')) * 1000000;
    }
    return parseFloat(cleaned);
  };

  const detectCategory = (description) => {
    const lowerDesc = description.toLowerCase();

    for (const target of targets) {
      for (const keyword of target.keywords) {
        if (lowerDesc.includes(keyword)) {
          return target.name;
        }
      }
    }

    const keywords = {
      'Makanan': ['makan', 'sarapan', 'lunch', 'dinner', 'nasi', 'ayam', 'snack', 'cemilan', 'kopi', 'minum', 'food', 'resto', 'warteg', 'mie', 'bakso'],
      'Transport': ['bensin', 'grab', 'gojek', 'ojol', 'parkir', 'tol', 'transport', 'angkot', 'bus', 'kereta', 'travel'],
      'Belanja': ['belanja', 'indomaret', 'alfamart', 'supermarket', 'grocery', 'shopee', 'tokopedia', 'lazada', 'beli'],
      'Hiburan': ['nonton', 'bioskop', 'game', 'streaming', 'spotify', 'netflix', 'jalan', 'wisata', 'karaoke', 'fm', 'mall'],
      'Tagihan': ['listrik', 'air', 'pdam', 'internet', 'wifi', 'pulsa', 'token', 'tagihan', 'bayar'],
      'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'klinik', 'vitamin', 'apotek', 'medical']
    };

    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some(word => lowerDesc.includes(word))) {
        return cat;
      }
    }

    return 'Lainnya';
  };

  const handleBulkInput = () => {
    if (!bulkInput.trim()) return;

    const lines = bulkInput.split('\\n').filter(line => line.trim());
    const newTransactions = [];
    const currentDate = new Date().toLocaleDateString('id-ID');

    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const desc = parts[0];
        const amountStr = parts[1];
        const amount = parseAmount(amountStr);
        const category = detectCategory(desc);

        if (desc && !isNaN(amount) && amount > 0) {
          newTransactions.push({
            id: Date.now() + Math.random(),
            description: desc,
            amount: amount,
            category: category,
            type: 'pengeluaran',
            date: currentDate
          });
        }
      }
    });

    if (newTransactions.length > 0) {
      setTransactions([...newTransactions, ...transactions]);
      setBulkInput('');
      triggerAnimation();
    }
  };

  const handleAddTransaction = () => {
    if (!description || !amount) return;

    const newTransaction = {
      id: Date.now(),
      description,
      amount: parseFloat(amount),
      category,
      type,
      date: new Date().toLocaleDateString('id-ID')
    };

    setTransactions([newTransaction, ...transactions]);
    setDescription('');
    setAmount('');
    triggerAnimation();
  };

  const triggerAnimation = () => {
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 1000);
  };

  const handleDeleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleAddTarget = () => {
    if (!newTargetName || !newTargetAmount) return;

    const keywords = newTargetName.toLowerCase().split(' ');
    const newTarget = {
      id: Date.now(),
      name: newTargetName,
      target: parseFloat(newTargetAmount),
      spent: 0,
      keywords: keywords
    };

    setTargets([...targets, newTarget]);

    if (!categories.pengeluaran.includes(newTargetName)) {
      categories.pengeluaran.push(newTargetName);
    }

    setNewTargetName('');
    setNewTargetAmount('');
  };

  const handleEditTarget = (target) => {
    setEditingTarget(target.id);
  };

  const handleUpdateTarget = (id, newAmount) => {
    setTargets(targets.map(t => 
      t.id === id ? { ...t, target: parseFloat(newAmount) } : t
    ));
    setEditingTarget(null);
  };

  const handleDeleteTarget = (id) => {
    setTargets(targets.filter(t => t.id !== id));
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    setFilterCategory('all');
  };

  const exportToExcel = () => {
    let csv = 'Tanggal,Deskripsi,Kategori,Tipe,Jumlah\\n';

    transactions.forEach(t => {
      csv += `${t.date},${t.description},${t.category},${t.type},${t.amount}\\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `budget_tracker_${new Date().toLocaleDateString('id-ID').replace(/\\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const { data: weeklyData, startDateStr, endDateStr } = getWeeklyData();
  const pieData = getPieChartData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Memuat data dari cloud...</p>
          <p className="text-gray-500 text-sm mt-2">Sync dengan Firebase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logout */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            💰 Budget Tracker Harian
          </h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">
              {user.email}
            </span>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 sm:p-4 rounded-lg flex items-center gap-2 sm:gap-3 animate-pulse ${
                  alert.type === 'danger' 
                    ? 'bg-red-100 border-l-4 border-red-500 text-red-800' 
                    : 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800'
                }`}
              >
                <AlertTriangle size={20} className="flex-shrink-0" />
                <p className="text-sm sm:text-base font-medium">{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Animation Effect */}
        {showAnimation && (
          <div className="fixed top-20 right-4 sm:right-8 z-50 animate-bounce">
            <div className="bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle size={20} />
              <span className="font-semibold text-sm sm:text-base">Tersimpan & Tersinkron!</span>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Pemasukan</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <TrendingUp className="text-green-600" size={28} />
            </div>
          </div>

(END OF FILE)
