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

  const allCategories = ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Ortu', 'Tabungan', 'Cicilan', 'Lainnya'];
  const incomeCategories = ['Gaji', 'Bonus', 'Hadiah', 'Lainnya'];
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Load from Firebase - ONLY ONCE
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
    var spent = 0;
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].type === 'pengeluaran' && transactions[i].category === targetName) {
        spent += transactions[i].amount;
      }
    }
    return spent;
  }

  // Calculate spent for "Lainnya" (all non-target expenses)
  function getSpentLainnya() {
    var targetNames = targets.map(function(t) { return t.name; });
    var spent = 0;
    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      if (t.type === 'pengeluaran' && targetNames.indexOf(t.category) === -1) {
        spent += t.amount;
      }
    }
    return spent;
  }

  // Get today's expense
  function getTodayExpense() {
    var today = new Date().toLocaleDateString('id-ID');
    var sum = 0;
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].type === 'pengeluaran' && transactions[i].date === today) {
        sum += transactions[i].amount;
      }
    }
    return sum;
  }

  // Get weekly data for chart
  function getWeeklyData() {
    var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    var today = new Date();
    var data = [];
    
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var dStr = d.toLocaleDateString('id-ID');
      
      var dayExpense = 0;
      var dayIncome = 0;
      for (var j = 0; j < transactions.length; j++) {
        var t = transactions[j];
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

  // Parse date string to Date object
  function parseDate(dateStr) {
    var parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  // Get filtered expense by date range
  function getFilteredExpense() {
    if (!filterStartDate && !filterEndDate) return null;
    
    var sum = 0;
    var count = 0;
    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
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
    var result = [];
    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      
      // Search filter
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        if (t.description.toLowerCase().indexOf(q) === -1 && t.category.toLowerCase().indexOf(q) === -1) {
          continue;
        }
      }
      
      // Date filter
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
    var sum = 0;
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].type === 'pemasukan') sum += transactions[i].amount;
    }
    return sum;
  }

  function getTotalExpense() {
    var sum = 0;
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].type === 'pengeluaran') sum += transactions[i].amount;
    }
    return sum;
  }

  // Pie chart data
  function getPieData() {
    var cats = {};
    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
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
    if (ld.indexOf('makan') !== -1 || ld.indexOf('kopi') !== -1) return 'Makanan';
    if (ld.indexOf('grab') !== -1 || ld.indexOf('gojek') !== -1 || ld.indexOf('bensin') !== -1) return 'Transport';
    if (ld.indexOf('nonton') !== -1 || ld.indexOf('mall') !== -1) return 'Hiburan';
    return 'Lainnya';
  }

  // Bulk input handler
  function handleBulkInput() {
    if (!bulkInput.trim()) return;
    var lines = bulkInput.split('\n');
    var newTrans = [];
    var curDate = new Date().toLocaleDateString('id-ID');
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
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
            date: curDate
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

  // Get alerts
  function getAlerts() {
    var alerts = [];
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var spent = getSpent(t.name);
      var pct = (spent / t.target) * 100;
      if (pct >= 100) alerts.push({ type: 'danger', msg: 'Target ' + t.name + ' melewati budget!' });
      else if (pct >= 80) alerts.push({ type: 'warning', msg: 'Target ' + t.name + ' sudah ' + pct.toFixed(0) + '%' });
    }
    var spentLainnya = getSpentLainnya();
    var pctLainnya = (spentLainnya / budgetLainnya) * 100;
    if (pctLainnya >= 100) alerts.push({ type: 'danger', msg: 'Budget Lainnya melewati target!' });
    else if (pctLainnya >= 80) alerts.push({ type: 'warning', msg: 'Budget Lainnya sudah ' + pctLainnya.toFixed(0) + '%' });
    return alerts;
  }

  var totalIncome = getTotalIncome();
  var totalExpense = getTotalExpense();
  var todayExpense = getTodayExpense();
  var balance = totalIncome - totalExpense;
  var filteredTrans = getFilteredTransactions();
  var pieData = getPieData();
  var alerts = getAlerts();
  var spentLainnya = getSpentLainnya();
  var weeklyData = getWeeklyData();
  var filteredExpense = getFilteredExpense();

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
        
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">💰 Budget Tracker</h1>
          <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map(function(a, i) {
              return (
                <div key={i} className={'p-3 rounded-lg flex items-center gap-2 ' + (a.type === 'danger' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>
                  <AlertTriangle size={20} />
                  <p className="text-sm font-medium">{a.msg}</p>
                </div>
              );
            })}
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

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-600">Pemasukan</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-600">Pengeluaran</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-600">Saldo</p>
            <p className={'text-xl font-bold ' + (balance >= 0 ? 'text-blue-600' : 'text-red-600')}>{formatCurrency(balance)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-2 border-orange-200">
            <p className="text-xs text-gray-600">📅 Hari Ini</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(todayExpense)}</p>
          </div>
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
              <p className="text-xs mb-2 opacity-90">Format: deskripsi, jumlah (contoh: makan, 15k)</p>
              <textarea value={bulkInput} onChange={function(e) { setBulkInput(e.target.value); }} placeholder={'makan, 15k\ngrab, 25k\nortu, 1000k'} className="w-full px-3 py-2 rounded-lg text-gray-800 h-24 resize-none text-sm" />
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

            <div className="space-y-3">
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
            <input type="text" value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }} placeholder="Cari..." className="w-full px-3 py-2 border rounded text-sm mb-3" />
            {filteredTrans.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Belum ada transaksi</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTrans.map(function(t) {
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div>
                        <span className={'px-1 py-0.5 text-xs rounded mr-2 ' + (t.type === 'pemasukan' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{t.category}</span>
                        <span>{t.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={t.type === 'pemasukan' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {t.type === 'pemasukan' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                        <button onClick={function() { deleteTrans(t.id); }} className="text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
