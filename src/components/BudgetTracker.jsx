import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Target, Edit2, Check, X, Zap, Calendar, Filter, Download, Search, AlertTriangle, CheckCircle, LogOut, Bell, XCircle, BarChart3, TrendingDown as TrendDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ref, set, onValue } from 'firebase/database';
import { database } from '../firebase';

export default function BudgetTracker({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [bulkInput, setBulkInput] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [type, setType] = useState('pengeluaran');
  const [budgetLainnya, setBudgetLainnya] = useState(3000000);
  const [targets, setTargets] = useState([
    { id: 1, name: 'Ortu', target: 2000000, keywords: ['ortu', 'orang tua', 'orangtua'] },
    { id: 2, name: 'Tabungan', target: 1000000, keywords: ['tabungan', 'nabung', 'saving'] },
    { id: 3, name: 'Cicilan', target: 500000, keywords: ['cicilan', 'bayar cicilan'] }
  ]);
  const [showBulkInput, setShowBulkInput] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState({});
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  const allCategories = ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Ortu', 'Tabungan', 'Cicilan', 'Lainnya'];
  const incomeCategories = ['Gaji', 'Bonus', 'Hadiah', 'Lainnya'];
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Get current period start date (25th of last month)
  function getCurrentPeriodStart() {
    var today = new Date();
    var year = today.getFullYear();
    var month = today.getMonth();
    
    if (today.getDate() < 25) {
      month = month - 1;
      if (month < 0) {
        month = 11;
        year = year - 1;
      }
    }
    
    return new Date(year, month, 25, 0, 0, 0);
  }

  // Get previous period dates
  function getPreviousPeriodDates() {
    var currentStart = getCurrentPeriodStart();
    var prevStart = new Date(currentStart);
    prevStart.setMonth(prevStart.getMonth() - 1);
    
    var prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    
    return { start: prevStart, end: prevEnd };
  }

  // Parse date string to Date object
  function parseDate(dateStr) {
    var parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  // Check if transaction is in current period
  function isInCurrentPeriod(dateStr) {
    var periodStart = getCurrentPeriodStart();
    var transDate = parseDate(dateStr);
    return transDate >= periodStart;
  }

  // Check if transaction is in previous period
  function isInPreviousPeriod(dateStr) {
    var prev = getPreviousPeriodDates();
    var transDate = parseDate(dateStr);
    return transDate >= prev.start && transDate <= prev.end;
  }

  // Get transactions for display (filtered by period if needed)
  function getActiveTransactions() {
    if (showAllPeriods) return transactions;
    return transactions.filter(function(t) { return isInCurrentPeriod(t.date); });
  }

  // Get previous period transactions
  function getPreviousPeriodTransactions() {
    return transactions.filter(function(t) { return isInPreviousPeriod(t.date); });
  }

  // Load from Firebase
  useEffect(function() {
    if (!user) return;
    
    var transRef = ref(database, 'users/' + user.uid + '/transactions');
    var targRef = ref(database, 'users/' + user.uid + '/targets');
    var budgetRef = ref(database, 'users/' + user.uid + '/budgetLainnya');
    
    var unsub1 = onValue(transRef, function(snap) {
      var data = snap.val();
      if (data) {
        setTransactions(Array.isArray(data) ? data : Object.values(data));
      } else {
        setTransactions([]);
      }
      setIsLoading(false);
    });
    
    var unsub2 = onValue(targRef, function(snap) {
      var data = snap.val();
      if (data) {
        setTargets(Array.isArray(data) ? data : Object.values(data));
      }
    });
    
    var unsub3 = onValue(budgetRef, function(snap) {
      var data = snap.val();
      if (data) {
        setBudgetLainnya(data);
      }
    });
    
    return function() { 
      unsub1(); 
      unsub2();
      unsub3();
    };
  }, [user]);

  // Check for budget alerts and create notifications
  useEffect(function() {
    var newNotifs = [];
    var currentPeriodKey = getCurrentPeriodStart().toISOString();
    
    // Check targets
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var spent = getSpent(t.name);
      var pct = (spent / t.target) * 100;
      var alertKey = currentPeriodKey + '-' + t.name;
      
      if (pct >= 100 && !dismissedAlerts[alertKey + '-100']) {
        var notif100 = { 
          id: alertKey + '-100', 
          type: 'danger', 
          title: 'Budget Habis!',
          msg: 'Target ' + t.name + ' sudah melewati budget (' + pct.toFixed(0) + '%)',
          timestamp: new Date().toLocaleString('id-ID')
        };
        newNotifs.push(notif100);
        // Add to history if not already there
        if (!notificationHistory.some(function(n) { return n.id === notif100.id; })) {
          setNotificationHistory(function(prev) { return [notif100].concat(prev); });
        }
      } else if (pct >= 75 && pct < 100 && !dismissedAlerts[alertKey + '-75']) {
        var notif75 = { 
          id: alertKey + '-75', 
          type: 'warning', 
          title: 'Peringatan Budget',
          msg: 'Target ' + t.name + ' sudah ' + pct.toFixed(0) + '% dari budget',
          timestamp: new Date().toLocaleString('id-ID')
        };
        newNotifs.push(notif75);
        if (!notificationHistory.some(function(n) { return n.id === notif75.id; })) {
          setNotificationHistory(function(prev) { return [notif75].concat(prev); });
        }
      } else if (pct >= 50 && pct < 75 && !dismissedAlerts[alertKey + '-50']) {
        var notif50 = { 
          id: alertKey + '-50', 
          type: 'info', 
          title: 'Info Budget',
          msg: 'Target ' + t.name + ' sudah ' + pct.toFixed(0) + '% dari budget',
          timestamp: new Date().toLocaleString('id-ID')
        };
        newNotifs.push(notif50);
        if (!notificationHistory.some(function(n) { return n.id === notif50.id; })) {
          setNotificationHistory(function(prev) { return [notif50].concat(prev); });
        }
      }
    }
    
    // Check Lainnya budget
    var spentLainnya = getSpentLainnya();
    var pctLainnya = (spentLainnya / budgetLainnya) * 100;
    var lainnyaKey = currentPeriodKey + '-lainnya';
    
    if (pctLainnya >= 100 && !dismissedAlerts[lainnyaKey + '-100']) {
      var lNotif100 = { 
        id: lainnyaKey + '-100', 
        type: 'danger', 
        title: 'Budget Lainnya Habis!',
        msg: 'Budget Lainnya sudah melewati target (' + pctLainnya.toFixed(0) + '%)',
        timestamp: new Date().toLocaleString('id-ID')
      };
      newNotifs.push(lNotif100);
      if (!notificationHistory.some(function(n) { return n.id === lNotif100.id; })) {
        setNotificationHistory(function(prev) { return [lNotif100].concat(prev); });
      }
    } else if (pctLainnya >= 75 && pctLainnya < 100 && !dismissedAlerts[lainnyaKey + '-75']) {
      var lNotif75 = { 
        id: lainnyaKey + '-75', 
        type: 'warning', 
        title: 'Peringatan Budget Lainnya',
        msg: 'Budget Lainnya sudah ' + pctLainnya.toFixed(0) + '% dari target',
        timestamp: new Date().toLocaleString('id-ID')
      };
      newNotifs.push(lNotif75);
      if (!notificationHistory.some(function(n) { return n.id === lNotif75.id; })) {
        setNotificationHistory(function(prev) { return [lNotif75].concat(prev); });
      }
    } else if (pctLainnya >= 50 && pctLainnya < 75 && !dismissedAlerts[lainnyaKey + '-50']) {
      var lNotif50 = { 
        id: lainnyaKey + '-50', 
        type: 'info', 
        title: 'Info Budget Lainnya',
        msg: 'Budget Lainnya sudah ' + pctLainnya.toFixed(0) + '% dari target',
        timestamp: new Date().toLocaleString('id-ID')
      };
      newNotifs.push(lNotif50);
      if (!notificationHistory.some(function(n) { return n.id === lNotif50.id; })) {
        setNotificationHistory(function(prev) { return [lNotif50].concat(prev); });
      }
    }
    
    setNotifications(newNotifs);
  }, [transactions, targets, budgetLainnya, dismissedAlerts]);

  function dismissNotification(id) {
    setDismissedAlerts(function(prev) {
      var updated = {};
      for (var key in prev) {
        updated[key] = prev[key];
      }
      updated[id] = true;
      return updated;
    });
    setNotifications(function(prev) {
      return prev.filter(function(n) { return n.id !== id; });
    });
  }

  // Save transactions
  function saveTransactions(newTrans) {
    setTransactions(newTrans);
    if (user) {
      set(ref(database, 'users/' + user.uid + '/transactions'), newTrans);
    }
  }

  // Save targets
  function saveTargets(newTargets) {
    setTargets(newTargets);
    if (user) {
      set(ref(database, 'users/' + user.uid + '/targets'), newTargets);
    }
  }

  // Calculate spent for a target
  function getSpent(targetName) {
    var activeTrans = getActiveTransactions();
    var spent = 0;
    for (var i = 0; i < activeTrans.length; i++) {
      if (activeTrans[i].type === 'pengeluaran' && activeTrans[i].category === targetName) {
        spent += activeTrans[i].amount;
      }
    }
    return spent;
  }

  // Calculate spent for "Lainnya" (all non-target expenses)
  function getSpentLainnya() {
    var activeTrans = getActiveTransactions();
    var targetNames = targets.map(function(t) { return t.name; });
    var spent = 0;
    for (var i = 0; i < activeTrans.length; i++) {
      var t = activeTrans[i];
      if (t.type === 'pengeluaran' && targetNames.indexOf(t.category) === -1) {
        spent += t.amount;
      }
    }
    return spent;
  }

  // Get breakdown of "Lainnya" subcategories (smart detection)
  function getLainnyaBreakdown() {
    var activeTrans = getActiveTransactions();
    var targetNames = targets.map(function(t) { return t.name; });
    var subcategories = {};
    
    // Keywords for subcategory detection
    var keywords = {
      'Makan & Minum': ['makan', 'nasi', 'ayam', 'bakso', 'soto', 'gado', 'sate', 'cafe', 'resto', 'kopi', 'teh', 'jus', 'minum', 'snack', 'gorengan', 'cemilan', 'jajan', 'warung', 'food', 'lunch', 'dinner', 'sarapan', 'breakfast', 'pizza', 'burger', 'seafood', 'padang', 'chinese', 'sushi', 'martabak', 'gudeg', 'bubur'],
      'Transport': ['grab', 'gojek', 'taxi', 'ojol', 'ojek', 'bensin', 'parkir', 'tol', 'busway', 'mrt', 'transjakarta', 'kereta', 'motor', 'mobil', 'uber', 'maxim', 'travel', 'angkot', 'bus'],
      'Belanja': ['beli', 'belanja', 'baju', 'celana', 'sepatu', 'tas', 'pakaian', 'fashion', 'outfit', 'shop', 'tokopedia', 'shopee', 'lazada', 'bukalapak', 'blibli', 'toped', 'shopping', 'mall', 'store'],
      'Hiburan': ['nonton', 'bioskop', 'cinema', 'game', 'main', 'karaoke', 'ktv', 'concert', 'konser', 'spotify', 'netflix', 'disney', 'youtube', 'steam', 'playstation', 'xbox', 'hiburan', 'jalan', 'liburan', 'wisata'],
      'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'rs', 'klinik', 'apotek', 'vitamin', 'medical', 'checkup', 'periksa', 'hospital', 'farmasi', 'terapi', 'fisio']
    };
    
    for (var i = 0; i < activeTrans.length; i++) {
      var t = activeTrans[i];
      // Only process transactions in "Lainnya" main category (not in target categories)
      if (t.type === 'pengeluaran' && targetNames.indexOf(t.category) === -1) {
        var desc = t.description.toLowerCase();
        var matched = false;
        
        // Try to match with keywords
        for (var subcat in keywords) {
          var kws = keywords[subcat];
          for (var j = 0; j < kws.length; j++) {
            if (desc.indexOf(kws[j]) !== -1) {
              subcategories[subcat] = (subcategories[subcat] || 0) + t.amount;
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
        
        // If no match, still count it but we'll show it separately or group as "Lainnya"
        if (!matched) {
          // Check if it's actually from non-Lainnya category (Makanan, Transport, etc from main categories)
          // If the main category is not in targets, we should still categorize it
          if (t.category !== 'Lainnya') {
            // Use the original category as subcategory
            subcategories[t.category] = (subcategories[t.category] || 0) + t.amount;
          } else {
            // Truly unmatched items go to "Lain-lain"
            subcategories['Lain-lain'] = (subcategories['Lain-lain'] || 0) + t.amount;
          }
        }
      }
    }
    
    var result = [];
    for (var cat in subcategories) {
      result.push({ category: cat, amount: subcategories[cat] });
    }
    
    result.sort(function(a, b) { return b.amount - a.amount; });
    return result;
  }

  // Get average daily spending for current period
  function getAverageDailySpending() {
    var activeTrans = getActiveTransactions();
    var periodStart = getCurrentPeriodStart();
    var today = new Date();
    var daysPassed = Math.floor((today - periodStart) / (1000 * 60 * 60 * 24)) + 1;
    
    var totalSpent = 0;
    for (var i = 0; i < activeTrans.length; i++) {
      if (activeTrans[i].type === 'pengeluaran') {
        totalSpent += activeTrans[i].amount;
      }
    }
    
    return daysPassed > 0 ? totalSpent / daysPassed : 0;
  }

  // Get today's expense
  function getTodayExpense() {
    var activeTrans = getActiveTransactions();
    var today = new Date().toLocaleDateString('id-ID');
    var sum = 0;
    for (var i = 0; i < activeTrans.length; i++) {
      if (activeTrans[i].type === 'pengeluaran' && activeTrans[i].date === today) {
        sum += activeTrans[i].amount;
      }
    }
    return sum;
  }

  // Get monthly spending trend (last 6 months)
  function getMonthlyTrend() {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Dec'];
    var data = [];
    var today = new Date();
    
    for (var i = 5; i >= 0; i--) {
      var d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      var monthKey = d.getMonth();
      var yearKey = d.getFullYear();
      
      var monthExpense = 0;
      var monthIncome = 0;
      
      for (var j = 0; j < transactions.length; j++) {
        var t = transactions[j];
        var tDate = parseDate(t.date);
        
        if (tDate.getMonth() === monthKey && tDate.getFullYear() === yearKey) {
          if (t.type === 'pengeluaran') monthExpense += t.amount;
          if (t.type === 'pemasukan') monthIncome += t.amount;
        }
      }
      
      data.push({
        month: months[monthKey] + ' ' + yearKey.toString().substr(2),
        Pengeluaran: monthExpense,
        Pemasukan: monthIncome
      });
    }
    
    return data;
  }

  // Get comparison data (current vs previous period)
  function getComparisonData() {
    var currentTrans = getActiveTransactions();
    var prevTrans = getPreviousPeriodTransactions();
    
    var currentExpense = 0;
    var currentIncome = 0;
    var prevExpense = 0;
    var prevIncome = 0;
    
    for (var i = 0; i < currentTrans.length; i++) {
      if (currentTrans[i].type === 'pengeluaran') currentExpense += currentTrans[i].amount;
      if (currentTrans[i].type === 'pemasukan') currentIncome += currentTrans[i].amount;
    }
    
    for (var j = 0; j < prevTrans.length; j++) {
      if (prevTrans[j].type === 'pengeluaran') prevExpense += prevTrans[j].amount;
      if (prevTrans[j].type === 'pemasukan') prevIncome += prevTrans[j].amount;
    }
    
    return [
      { period: 'Periode Lalu', Pengeluaran: prevExpense, Pemasukan: prevIncome },
      { period: 'Periode Ini', Pengeluaran: currentExpense, Pemasukan: currentIncome }
    ];
  }

  // Get weekly data for chart
  function getWeeklyData() {
    var activeTrans = getActiveTransactions();
    var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    var today = new Date();
    var data = [];
    
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var dStr = d.toLocaleDateString('id-ID');
      
      var dayExpense = 0;
      var dayIncome = 0;
      for (var j = 0; j < activeTrans.length; j++) {
        var t = activeTrans[j];
        if (t.date === dStr) {
          if (t.type === 'pengeluaran') dayExpense += t.amount;
          if (t.type === 'pemasukan') dayIncome += t.amount;
        }
      }
      
      data.push({
        day: days[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1),
        Pengeluaran: dayExpense,
        Pemasukan: dayIncome
      });
    }
    return data;
  }

  // Get filtered expense by date range
  function getFilteredExpense() {
    if (!filterStartDate && !filterEndDate) return null;
    
    var transToUse = showAllPeriods ? transactions : getActiveTransactions();
    var sum = 0;
    var count = 0;
    for (var i = 0; i < transToUse.length; i++) {
      var t = transToUse[i];
      if (t.type !== 'pengeluaran') continue;
      
      var tDate = parseDate(t.date);
      var start = filterStartDate ? new Date(filterStartDate) : null;
      var end = filterEndDate ? new Date(filterEndDate) : null;
      
      var match = true;
      if (start && tDate < start) match = false;
      if (end && tDate > end) match = false;
      
      if (match) {
        sum += t.amount;
        count++;
      }
    }
    return { total: sum, count: count };
  }

  // Filter transactions for display
  function getFilteredTransactions() {
    var transToUse = showAllPeriods ? transactions : getActiveTransactions();
    var result = [];
    for (var i = 0; i < transToUse.length; i++) {
      var t = transToUse[i];
      
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        if (t.description.toLowerCase().indexOf(q) === -1 && t.category.toLowerCase().indexOf(q) === -1) {
          continue;
        }
      }
      
      if (filterStartDate || filterEndDate) {
        var tDate = parseDate(t.date);
        var start = filterStartDate ? new Date(filterStartDate) : null;
        var end = filterEndDate ? new Date(filterEndDate) : null;
        
        if (start && tDate < start) continue;
        if (end && tDate > end) continue;
      }
      
      result.push(t);
    }
    return result;
  }

  // Calculate totals
  function getTotalIncome() {
    var activeTrans = getActiveTransactions();
    var sum = 0;
    for (var i = 0; i < activeTrans.length; i++) {
      if (activeTrans[i].type === 'pemasukan') sum += activeTrans[i].amount;
    }
    return sum;
  }

  function getTotalExpense() {
    var activeTrans = getActiveTransactions();
    var sum = 0;
    for (var i = 0; i < activeTrans.length; i++) {
      if (activeTrans[i].type === 'pengeluaran') sum += activeTrans[i].amount;
    }
    return sum;
  }

  // Pie chart data
  function getPieData() {
    var activeTrans = getActiveTransactions();
    var cats = {};
    for (var i = 0; i < activeTrans.length; i++) {
      var t = activeTrans[i];
      if (t.type === 'pengeluaran') {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      }
    }
    var result = [];
    for (var key in cats) {
      result.push({ name: key, value: cats[key] });
    }
    return result;
  }

  // Parse amount (15k -> 15000)
  function parseAmount(s) {
    var c = s.toLowerCase().replace(/\s/g, '');
    if (c.indexOf('k') !== -1) return parseFloat(c.replace('k', '')) * 1000;
    if (c.indexOf('jt') !== -1) return parseFloat(c.replace('jt', '')) * 1000000;
    return parseFloat(c);
  }

  // Detect category from description
  function detectCategory(desc) {
    var ld = desc.toLowerCase();
    
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.keywords) {
        for (var j = 0; j < tg.keywords.length; j++) {
          if (ld.indexOf(tg.keywords[j]) !== -1) return tg.name;
        }
      }
    }
    
    return 'Lainnya';
  }

  // Bulk input handler
  function handleBulkInput() {
    if (!bulkInput.trim()) return;
    var lines = bulkInput.split('\n');
    var newTrans = [];
    var currentDate = new Date().toLocaleDateString('id-ID');
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      
      var dateMatch = line.match(/^(\d{1,2})\/(\d{1,2}):?$/);
      if (dateMatch) {
        var day = dateMatch[1].padStart(2, '0');
        var month = dateMatch[2].padStart(2, '0');
        var year = new Date().getFullYear();
        currentDate = day + '/' + month + '/' + year;
        continue;
      }
      
      var parts = line.split(',');
      if (parts.length >= 2) {
        var desc = parts[0].trim();
        var amt = parseAmount(parts[1].trim());
        if (desc && !isNaN(amt) && amt > 0) {
          newTrans.push({
            id: Date.now() + Math.random(),
            description: desc,
            amount: amt,
            category: detectCategory(desc),
            type: 'pengeluaran',
            date: currentDate
          });
        }
      }
    }
    
    if (newTrans.length > 0) {
      saveTransactions(newTrans.concat(transactions));
      setBulkInput('');
      triggerAnimation();
    }
  }

  // Manual input handler
  function handleAddTrans() {
    if (!description || !amount) return;
    var newTrans = {
      id: Date.now(),
      description: description,
      amount: parseFloat(amount),
      category: category,
      type: type,
      date: new Date().toLocaleDateString('id-ID')
    };
    saveTransactions([newTrans].concat(transactions));
    setDescription('');
    setAmount('');
    triggerAnimation();
  }

  // Edit transaction handler
  function handleEditTrans() {
    if (!editingTransaction) return;
    
    var updated = transactions.map(function(t) {
      if (t.id === editingTransaction.id) {
        return {
          id: t.id,
          description: editingTransaction.description,
          amount: parseFloat(editingTransaction.amount),
          category: editingTransaction.category,
          type: editingTransaction.type,
          date: t.date
        };
      }
      return t;
    });
    
    saveTransactions(updated);
    setEditingTransaction(null);
    triggerAnimation();
  }

  function triggerAnimation() {
    setShowAnimation(true);
    setTimeout(function() { setShowAnimation(false); }, 1000);
  }

  function deleteTrans(id) {
    var newTrans = transactions.filter(function(t) { return t.id !== id; });
    saveTransactions(newTrans);
  }

  function deleteTarget(id) {
    var newTargets = targets.filter(function(t) { return t.id !== id; });
    saveTargets(newTargets);
  }

  function exportCSV() {
    var csv = 'Tanggal,Deskripsi,Kategori,Tipe,Jumlah\n';
    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      csv += t.date + ',' + t.description + ',' + t.category + ',' + t.type + ',' + t.amount + '\n';
    }
    var blob = new Blob([csv], { type: 'text/csv' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'budget.csv';
    link.click();
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }

  var totalIncome = getTotalIncome();
  var totalExpense = getTotalExpense();
  var todayExpense = getTodayExpense();
  var balance = totalIncome - totalExpense;
  var filteredTrans = getFilteredTransactions();
  var pieData = getPieData();
  var spentLainnya = getSpentLainnya();
  var weeklyData = getWeeklyData();
  var filteredExpense = getFilteredExpense();
  var periodStart = getCurrentPeriodStart();
  var activeTrans = getActiveTransactions();
  var avgDaily = getAverageDailySpending();
  var lainnyaBreakdown = getLainnyaBreakdown();
  var monthlyTrend = getMonthlyTrend();
  var comparisonData = getComparisonData();
  var prevPeriod = getPreviousPeriodDates();
  var prevTrans = getPreviousPeriodTransactions();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {notifications.map(function(notif) {
              var bgColor = notif.type === 'danger' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
              return (
                <div key={notif.id} className={'animate-slide-in-right ' + bgColor + ' text-white p-4 rounded-lg shadow-lg'}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Bell size={20} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-sm">{notif.title}</p>
                        <p className="text-xs mt-1 opacity-90">{notif.msg}</p>
                      </div>
                    </div>
                    <button onClick={function() { dismissNotification(notif.id); }} className="flex-shrink-0 hover:bg-white hover:bg-opacity-20 rounded p-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        {editingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Edit Transaksi</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipe</label>
                  <select value={editingTransaction.type} onChange={function(e) { 
                    setEditingTransaction({ 
                      id: editingTransaction.id,
                      description: editingTransaction.description,
                      amount: editingTransaction.amount,
                      category: e.target.value === 'pemasukan' ? 'Gaji' : 'Makanan',
                      type: e.target.value
                    }); 
                  }} className="w-full px-3 py-2 border rounded">
                    <option value="pengeluaran">Pengeluaran</option>
                    <option value="pemasukan">Pemasukan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <select value={editingTransaction.category} onChange={function(e) { 
                    setEditingTransaction({ 
                      id: editingTransaction.id,
                      description: editingTransaction.description,
                      amount: editingTransaction.amount,
                      category: e.target.value,
                      type: editingTransaction.type
                    }); 
                  }} className="w-full px-3 py-2 border rounded">
                    {(editingTransaction.type === 'pemasukan' ? incomeCategories : allCategories).map(function(c) { 
                      return <option key={c} value={c}>{c}</option>; 
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deskripsi</label>
                  <input type="text" value={editingTransaction.description} onChange={function(e) { 
                    setEditingTransaction({ 
                      id: editingTransaction.id,
                      description: e.target.value,
                      amount: editingTransaction.amount,
                      category: editingTransaction.category,
                      type: editingTransaction.type
                    }); 
                  }} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jumlah</label>
                  <input type="number" value={editingTransaction.amount} onChange={function(e) { 
                    setEditingTransaction({ 
                      id: editingTransaction.id,
                      description: editingTransaction.description,
                      amount: e.target.value,
                      category: editingTransaction.category,
                      type: editingTransaction.type
                    }); 
                  }} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleEditTrans} className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold">
                  Simpan
                </button>
                <button onClick={function() { setEditingTransaction(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-semibold">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">💰 Budget Tracker</h1>
            <p className="text-xs text-gray-500 mt-1">
              Periode: {periodStart.toLocaleDateString('id-ID')} - {new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 24).toLocaleDateString('id-ID')}
              {!showAllPeriods && <span className="ml-2 text-blue-600">({activeTrans.length} transaksi)</span>}
              {showAllPeriods && <span className="ml-2 text-purple-600">({transactions.length} total)</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={function() { setShowNotificationCenter(!showNotificationCenter); }} className="relative bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Bell size={16} />
              {notificationHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationHistory.length}
                </span>
              )}
            </button>
            <button onClick={function() { setShowAllPeriods(!showAllPeriods); }} className={'px-3 py-2 rounded-lg text-sm font-semibold ' + (showAllPeriods ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700')}>
              {showAllPeriods ? '📚 Semua' : '📅 Periode Ini'}
            </button>
            <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Notification Center Modal */}
        {showNotificationCenter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Bell size={24} />
                  Riwayat Notifikasi
                </h2>
                <button onClick={function() { setShowNotificationCenter(false); }} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              
              {notificationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada notifikasi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificationHistory.map(function(notif) {
                    var bgColor = notif.type === 'danger' ? 'bg-red-50 border-red-200' : notif.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
                    var textColor = notif.type === 'danger' ? 'text-red-800' : notif.type === 'warning' ? 'text-yellow-800' : 'text-blue-800';
                    var iconColor = notif.type === 'danger' ? 'text-red-600' : notif.type === 'warning' ? 'text-yellow-600' : 'text-blue-600';
                    
                    return (
                      <div key={notif.id} className={'border rounded-lg p-3 ' + bgColor}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={18} className={'mt-0.5 flex-shrink-0 ' + iconColor} />
                          <div className="flex-1">
                            <p className={'font-bold text-sm ' + textColor}>{notif.title}</p>
                            <p className={'text-xs mt-1 ' + textColor}>{notif.msg}</p>
                            <p className="text-xs text-gray-500 mt-2">{notif.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {notificationHistory.length > 0 && (
                <button onClick={function() { setNotificationHistory([]); }} className="w-full mt-4 bg-gray-200 text-gray-700 py-2 rounded font-semibold text-sm hover:bg-gray-300">
                  Hapus Semua Riwayat
                </button>
              )}
            </div>
          </div>
        )}

        {showAnimation && (
          <div className="fixed top-20 right-4 z-50 animate-bounce">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle size={20} />
              <span className="font-semibold">Tersimpan!</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-600">Pemasukan</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-600">Pengeluaran</p>
            <p className="text-lg sm:text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-600">Saldo</p>
            <p className={'text-lg sm:text-xl font-bold ' + (balance >= 0 ? 'text-blue-600' : 'text-red-600')}>{formatCurrency(balance)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-2 border-orange-200">
            <p className="text-xs text-gray-600">📅 Hari Ini</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600">{formatCurrency(todayExpense)}</p>
          </div>
        </div>

        {/* Average Daily Spending + Lainnya Breakdown */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-4 mb-4 text-white">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <BarChart3 size={20} />
            Analisis Kategori "Lainnya"
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm opacity-90 mb-1">Rata-rata Pengeluaran per Hari</p>
              <p className="text-2xl font-bold">{formatCurrency(avgDaily)}</p>
              <p className="text-xs opacity-75 mt-1">Dari {Math.floor((new Date() - periodStart) / (1000 * 60 * 60 * 24)) + 1} hari periode ini</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm opacity-90 mb-2">Breakdown Sub-Kategori "Lainnya"</p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {lainnyaBreakdown.length === 0 ? (
                  <p className="text-xs opacity-75">Belum ada data</p>
                ) : (
                  lainnyaBreakdown.map(function(item) {
                    var percentage = spentLainnya > 0 ? ((item.amount / spentLainnya) * 100).toFixed(1) : 0;
                    return (
                      <div key={item.category} className="flex justify-between text-xs items-center">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold">{item.category}</span>
                          <span className="opacity-75">({percentage}%)</span>
                        </span>
                        <span className="font-semibold">{formatCurrency(item.amount)}</span>
                      </div>
                    );
                  })
                )}
              </div>
              {lainnyaBreakdown.length > 0 && (
                <p className="text-xs opacity-75 mt-2 pt-2 border-t border-white border-opacity-30">
                  Total "Lainnya": {formatCurrency(spentLainnya)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Spending Trend */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendDown size={20} className="text-blue-600" />
            Tren Pengeluaran Bulanan (6 Bulan Terakhir)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" style={{ fontSize: '11px' }} />
              <YAxis style={{ fontSize: '10px' }} />
              <Tooltip formatter={function(v) { return formatCurrency(v); }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Chart */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={20} className="text-purple-600" />
            Perbandingan Periode
          </h2>
          <div className="text-xs text-gray-600 mb-3">
            <span className="font-semibold">Periode Lalu:</span> {prevPeriod.start.toLocaleDateString('id-ID')} - {prevPeriod.end.toLocaleDateString('id-ID')} ({prevTrans.length} transaksi)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" style={{ fontSize: '11px' }} />
              <YAxis style={{ fontSize: '10px' }} />
              <Tooltip formatter={function(v) { return formatCurrency(v); }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Pengeluaran" fill="#ef4444" />
              <Bar dataKey="Pemasukan" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          {comparisonData[1].Pengeluaran > 0 && comparisonData[0].Pengeluaran > 0 && (
            <div className="mt-3 text-sm">
              {comparisonData[1].Pengeluaran > comparisonData[0].Pengeluaran ? (
                <p className="text-red-600">
                  📈 Pengeluaran naik {formatCurrency(comparisonData[1].Pengeluaran - comparisonData[0].Pengeluaran)} 
                  ({((comparisonData[1].Pengeluaran / comparisonData[0].Pengeluaran - 1) * 100).toFixed(1)}%) vs periode lalu
                </p>
              ) : (
                <p className="text-green-600">
                  📉 Pengeluaran turun {formatCurrency(comparisonData[0].Pengeluaran - comparisonData[1].Pengeluaran)} 
                  ({((1 - comparisonData[1].Pengeluaran / comparisonData[0].Pengeluaran) * 100).toFixed(1)}%) vs periode lalu
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">📊 Pengeluaran 7 Hari Terakhir</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" style={{ fontSize: '10px' }} />
              <YAxis style={{ fontSize: '10px' }} />
              <Tooltip formatter={function(v) { return formatCurrency(v); }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Pengeluaran" fill="#ef4444" />
              <Bar dataKey="Pemasukan" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">🔍 Filter Berdasarkan Tanggal</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Dari Tanggal</label>
              <input type="date" value={filterStartDate} onChange={function(e) { setFilterStartDate(e.target.value); }} className="px-3 py-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sampai Tanggal</label>
              <input type="date" value={filterEndDate} onChange={function(e) { setFilterEndDate(e.target.value); }} className="px-3 py-2 border rounded text-sm" />
            </div>
            {(filterStartDate || filterEndDate) && (
              <button onClick={function() { setFilterStartDate(''); setFilterEndDate(''); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm">
                Reset
              </button>
            )}
          </div>
          
          {filteredExpense && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Total Pengeluaran 
                    {filterStartDate && filterEndDate && (
                      <span className="font-semibold"> ({filterStartDate} s/d {filterEndDate})</span>
                    )}
                    {filterStartDate && !filterEndDate && (
                      <span className="font-semibold"> (dari {filterStartDate})</span>
                    )}
                    {!filterStartDate && filterEndDate && (
                      <span className="font-semibold"> (sampai {filterEndDate})</span>
                    )}
                  </p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(filteredExpense.total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{filteredExpense.count} transaksi</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-4 mb-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Zap size={24} />
              Input Cepat
            </h2>
            <button onClick={function() { setShowBulkInput(!showBulkInput); }} className="bg-white text-purple-600 px-3 py-2 rounded-lg text-sm font-semibold">
              {showBulkInput ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          {showBulkInput && (
            <div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-3">
                <p className="text-xs mb-1">📝 <strong>Format:</strong> deskripsi, jumlah</p>
                <p className="text-xs opacity-90">Tanpa tanggal = hari ini</p>
                <p className="text-xs opacity-90">Dengan tanggal = tulis <strong>dd/mm:</strong> di baris terpisah</p>
              </div>
              <textarea value={bulkInput} onChange={function(e) { setBulkInput(e.target.value); }} placeholder={'makan, 15k\ngrab, 25k\n\n20/11:\nkopi, 10k\njajan, 5k'} className="w-full px-3 py-2 rounded-lg text-gray-800 h-32 resize-none text-sm font-mono" />
              <button onClick={handleBulkInput} className="w-full bg-white text-purple-600 font-bold py-2 rounded-lg mt-3">
                Tambahkan Semua!
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">🥧 Breakdown Pengeluaran</h2>
            {pieData.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Belum ada data</p>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {pieData.map(function(e, i) { return <Cell key={'c' + i} fill={COLORS[i % COLORS.length]} />; })}
                    </Pie>
                    <Tooltip formatter={function(v) { return formatCurrency(v); }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {pieData.map(function(e, i) {
                    return (
                      <div key={e.name} className="flex items-center gap-1 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span>{e.name}: {formatCurrency(e.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target size={20} />
              Target Pengeluaran
            </h2>
            
            <div className="flex gap-2 mb-3">
              <input type="text" id="newTargetName" placeholder="Nama (cth: Kuota)" className="flex-1 px-2 py-1 border rounded text-sm" />
              <input type="number" id="newTargetAmount" placeholder="Budget" className="w-24 px-2 py-1 border rounded text-sm" />
              <button onClick={function() {
                var name = document.getElementById('newTargetName').value;
                var amt = document.getElementById('newTargetAmount').value;
                if (name && amt) {
                  var newTarget = {
                    id: Date.now(),
                    name: name,
                    target: parseFloat(amt),
                    keywords: [name.toLowerCase()]
                  };
                  saveTargets(targets.concat([newTarget]));
                  document.getElementById('newTargetName').value = '';
                  document.getElementById('newTargetAmount').value = '';
                }
              }} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {targets.map(function(tg) {
                var spent = getSpent(tg.name);
                var pct = (spent / tg.target) * 100;
                var over = spent > tg.target;
                return (
                  <div key={tg.id} className="border rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">{tg.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={function() {
                          var newAmt = prompt('Masukkan budget baru untuk ' + tg.name + ':', tg.target);
                          if (newAmt && !isNaN(parseFloat(newAmt))) {
                            var updated = targets.map(function(t) {
                              if (t.id === tg.id) {
                                return { id: t.id, name: t.name, target: parseFloat(newAmt), keywords: t.keywords };
                              }
                              return t;
                            });
                            saveTargets(updated);
                          }
                        }} className="text-blue-500 text-xs">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={function() { deleteTarget(tg.id); }} className="text-red-500 text-xs">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Terpakai: {formatCurrency(spent)}</span>
                      <span className={over ? 'text-red-600' : 'text-green-600'}>
                        {over ? 'Lebih' : 'Sisa'}: {formatCurrency(Math.abs(tg.target - spent))}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={'h-2 rounded-full ' + (over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: Math.min(pct, 100) + '%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Target: {formatCurrency(tg.target)} ({pct.toFixed(0)}%)</p>
                  </div>
                );
              })}
              
              <div className="border rounded p-2 bg-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">Lainnya (Non-Target)</span>
                  <button onClick={function() {
                    var newAmt = prompt('Masukkan budget baru untuk Lainnya:', budgetLainnya);
                    if (newAmt && !isNaN(parseFloat(newAmt))) {
                      setBudgetLainnya(parseFloat(newAmt));
                      if (user) {
                        set(ref(database, 'users/' + user.uid + '/budgetLainnya'), parseFloat(newAmt));
                      }
                    }
                  }} className="text-blue-500 text-xs">
                    <Edit2 size={12} />
                  </button>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Terpakai: {formatCurrency(spentLainnya)}</span>
                  <span className={spentLainnya > budgetLainnya ? 'text-red-600' : 'text-green-600'}>
                    {spentLainnya > budgetLainnya ? 'Lebih' : 'Sisa'}: {formatCurrency(Math.abs(budgetLainnya - spentLainnya))}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={'h-2 rounded-full ' + (spentLainnya > budgetLainnya ? 'bg-red-500' : (spentLainnya / budgetLainnya) > 0.8 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: Math.min((spentLainnya / budgetLainnya) * 100, 100) + '%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Budget: {formatCurrency(budgetLainnya)} ({((spentLainnya / budgetLainnya) * 100).toFixed(0)}%)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">Input Manual</h2>
            <div className="space-y-3">
              <select value={type} onChange={function(e) { setType(e.target.value); setCategory(e.target.value === 'pemasukan' ? 'Gaji' : 'Makanan'); }} className="w-full px-3 py-2 border rounded text-sm">
                <option value="pengeluaran">Pengeluaran</option>
                <option value="pemasukan">Pemasukan</option>
              </select>
              <select value={category} onChange={function(e) { setCategory(e.target.value); }} className="w-full px-3 py-2 border rounded text-sm">
                {(type === 'pemasukan' ? incomeCategories : allCategories).map(function(c) { 
                  return <option key={c} value={c}>{c}</option>; 
                })}
              </select>
              <input type="text" value={description} onChange={function(e) { setDescription(e.target.value); }} placeholder="Deskripsi" className="w-full px-3 py-2 border rounded text-sm" />
              <input type="number" value={amount} onChange={function(e) { setAmount(e.target.value); }} placeholder="Jumlah (Rp)" className="w-full px-3 py-2 border rounded text-sm" />
              <button onClick={handleAddTrans} className="w-full bg-blue-600 text-white font-semibold py-2 rounded flex items-center justify-center gap-2">
                <Plus size={18} />
                Tambah
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Riwayat</h2>
              <button onClick={exportCSV} className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Download size={14} />
                Export
              </button>
            </div>
            <input type="text" value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }} placeholder="Cari deskripsi/kategori..." className="w-full px-3 py-2 border rounded text-sm mb-2" />

            {filteredTrans.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Belum ada transaksi</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTrans.map(function(t) {
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2 border rounded text-sm hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={'px-1 py-0.5 text-xs rounded ' + (t.type === 'pemasukan' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{t.category}</span>
                          <span className="text-xs text-gray-400">{t.date}</span>
                        </div>
                        <span className="text-gray-800">{t.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={t.type === 'pemasukan' ? 'text-green-600 font-semibold text-sm' : 'text-red-600 font-semibold text-sm'}>
                          {t.type === 'pemasukan' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                        <button onClick={function() { 
                          setEditingTransaction({
                            id: t.id,
                            description: t.description,
                            amount: t.amount,
                            category: t.category,
                            type: t.type
                          }); 
                        }} className="text-blue-500 hover:text-blue-700">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={function() { deleteTrans(t.id); }} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {filteredTrans.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 text-right">{filteredTrans.length} transaksi</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
