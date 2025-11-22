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

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  useEffect(() => {
    if (!user) return;
    const transRef = ref(database, 'users/' + user.uid + '/transactions');
    const targRef = ref(database, 'users/' + user.uid + '/targets');
    const unsubT = onValue(transRef, function(snap) {
      const data = snap.val();
      if (data) {
        if (Array.isArray(data)) {
          setTransactions(data);
        } else {
          setTransactions(Object.values(data));
        }
      }
      setIsLoading(false);
    });
    const unsubTar = onValue(targRef, function(snap) {
      const data = snap.val();
      if (data) {
        if (Array.isArray(data)) {
          setTargets(data);
        } else {
          setTargets(Object.values(data));
        }
      }
    });
    return function() { 
      unsubT(); 
      unsubTar(); 
    };
  }, [user]);

  useEffect(() => {
    if (!isLoading && user) {
      set(ref(database, 'users/' + user.uid + '/transactions'), transactions);
    }
  }, [transactions, isLoading, user]);

  useEffect(() => {
    if (!isLoading && user) {
      set(ref(database, 'users/' + user.uid + '/targets'), targets);
    }
  }, [targets, isLoading, user]);

  useEffect(() => {
    var newAlerts = [];
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var pct = (t.spent / t.target) * 100;
      if (pct >= 100) {
        newAlerts.push({ type: 'danger', message: 'Target ' + t.name + ' melewati budget!' });
      } else if (pct >= 80) {
        newAlerts.push({ type: 'warning', message: 'Target ' + t.name + ' sudah ' + pct.toFixed(0) + '%' });
      }
    }
    setAlerts(newAlerts);
  }, [targets]);

  useEffect(() => {
    var targetNames = [];
    for (var i = 0; i < targets.length; i++) {
      if (!targets[i].isOther) {
        targetNames.push(targets[i].name);
      }
    }
    
    var updatedTargets = [];
    for (var j = 0; j < targets.length; j++) {
      var tg = targets[j];
      var spent = 0;
      
      if (tg.isOther) {
        for (var k = 0; k < transactions.length; k++) {
          var tr = transactions[k];
          if (tr.type === 'pengeluaran' && targetNames.indexOf(tr.category) === -1) {
            spent += tr.amount;
          }
        }
      } else {
        for (var m = 0; m < transactions.length; m++) {
          var trx = transactions[m];
          if (trx.type === 'pengeluaran' && trx.category === tg.name) {
            spent += trx.amount;
          }
        }
      }
      
      updatedTargets.push({
        id: tg.id,
        name: tg.name,
        target: tg.target,
        spent: spent,
        keywords: tg.keywords,
        isOther: tg.isOther
      });
    }
    setTargets(updatedTargets);
  }, [transactions]);

  function parseDate(d) {
    var parts = d.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  function getFilteredTransactions() {
    var result = [];
    for (var i = 0; i < transactions.length; i++) {
      var t = transactions[i];
      var dateMatch = true;
      
      if (filterStartDate || filterEndDate) {
        var td = parseDate(t.date);
        var sd = filterStartDate ? new Date(filterStartDate) : null;
        var ed = filterEndDate ? new Date(filterEndDate) : null;
        if (sd && ed) {
          dateMatch = td >= sd && td <= ed;
        } else if (sd) {
          dateMatch = td >= sd;
        } else if (ed) {
          dateMatch = td <= ed;
        }
      }
      
      var searchMatch = !searchQuery || t.description.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
      var catMatch = filterCategory === 'all' || t.category === filterCategory;
      
      if (dateMatch && searchMatch && catMatch) {
        result.push(t);
      }
    }
    return result;
  }

  var filteredTransactions = getFilteredTransactions();

  function calcTotalIncome() {
    var sum = 0;
    for (var i = 0; i < filteredTransactions.length; i++) {
      if (filteredTransactions[i].type === 'pemasukan') {
        sum += filteredTransactions[i].amount;
      }
    }
    return sum;
  }

  function calcTotalExpense() {
    var sum = 0;
    for (var i = 0; i < filteredTransactions.length; i++) {
      if (filteredTransactions[i].type === 'pengeluaran') {
        sum += filteredTransactions[i].amount;
      }
    }
    return sum;
  }

  var totalIncome = calcTotalIncome();
  var totalExpense = calcTotalExpense();
  var balance = totalIncome - totalExpense;

  function getPieData() {
    var cats = {};
    for (var i = 0; i < filteredTransactions.length; i++) {
      var t = filteredTransactions[i];
      if (t.type === 'pengeluaran') {
        if (cats[t.category]) {
          cats[t.category] += t.amount;
        } else {
          cats[t.category] = t.amount;
        }
      }
    }
    var result = [];
    for (var key in cats) {
      result.push({ name: key, value: cats[key] });
    }
    return result;
  }

  function getWeeklyData() {
    var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    var today = new Date();
    var start = new Date(today);
    start.setDate(today.getDate() - (chartWeekOffset * 7) - 6);
    var data = [];
    var startStr = '';
    var endStr = '';
    
    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      var dStr = d.toLocaleDateString('id-ID');
      if (i === 0) startStr = dStr;
      if (i === 6) endStr = dStr;
      
      var dayIncome = 0;
      var dayExpense = 0;
      for (var j = 0; j < transactions.length; j++) {
        var t = transactions[j];
        if (t.date === dStr) {
          if (t.type === 'pemasukan') dayIncome += t.amount;
          if (t.type === 'pengeluaran') dayExpense += t.amount;
        }
      }
      
      data.push({
        day: days[d.getDay()] + '\n' + d.getDate() + '/' + (d.getMonth() + 1),
        Pemasukan: dayIncome,
        Pengeluaran: dayExpense
      });
    }
    return { data: data, startStr: startStr, endStr: endStr };
  }

  function parseAmount(s) {
    var c = s.toLowerCase().replace(/\s/g, '');
    if (c.indexOf('k') !== -1) {
      return parseFloat(c.replace('k', '')) * 1000;
    }
    if (c.indexOf('jt') !== -1) {
      return parseFloat(c.replace('jt', '')) * 1000000;
    }
    return parseFloat(c);
  }

  function detectCategory(desc) {
    var ld = desc.toLowerCase();
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      for (var j = 0; j < tg.keywords.length; j++) {
        if (ld.indexOf(tg.keywords[j]) !== -1) {
          return tg.name;
        }
      }
    }
    var kws = {
      'Makanan': ['makan', 'sarapan', 'kopi', 'minum', 'nasi'],
      'Transport': ['bensin', 'grab', 'gojek', 'parkir', 'tol'],
      'Hiburan': ['nonton', 'game', 'jalan', 'fm', 'mall']
    };
    for (var cat in kws) {
      var words = kws[cat];
      for (var k = 0; k < words.length; k++) {
        if (ld.indexOf(words[k]) !== -1) {
          return cat;
        }
      }
    }
    return 'Lainnya';
  }

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
      setTransactions(newTrans.concat(transactions));
      setBulkInput('');
      triggerAnimation();
    }
  }

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
    setTransactions([newTrans].concat(transactions));
    setDescription('');
    setAmount('');
    triggerAnimation();
  }

  function triggerAnimation() {
    setShowAnimation(true);
    setTimeout(function() {
      setShowAnimation(false);
    }, 1000);
  }

  function deleteTrans(id) {
    var newTrans = [];
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].id !== id) {
        newTrans.push(transactions[i]);
      }
    }
    setTransactions(newTrans);
  }

  function addTarget() {
    if (!newTargetName || !newTargetAmount) return;
    var newTg = {
      id: Date.now(),
      name: newTargetName,
      target: parseFloat(newTargetAmount),
      spent: 0,
      keywords: newTargetName.toLowerCase().split(' '),
      isOther: false
    };
    setTargets(targets.concat([newTg]));
    if (categories.pengeluaran.indexOf(newTargetName) === -1) {
      categories.pengeluaran.push(newTargetName);
    }
    setNewTargetName('');
    setNewTargetAmount('');
  }

  function updateTarget(id, amt) {
    var updated = [];
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].id === id) {
        updated.push({
          id: targets[i].id,
          name: targets[i].name,
          target: parseFloat(amt),
          spent: targets[i].spent,
          keywords: targets[i].keywords,
          isOther: targets[i].isOther
        });
      } else {
        updated.push(targets[i]);
      }
    }
    setTargets(updated);
    setEditingTarget(null);
  }

  function deleteTarget(id) {
    var newTargets = [];
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].id !== id) {
        newTargets.push(targets[i]);
      }
    }
    setTargets(newTargets);
  }

  function clearFilters() {
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    setFilterCategory('all');
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
    link.download = 'budget_' + new Date().toLocaleDateString('id-ID').replace(/\//g, '-') + '.csv';
    link.click();
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }

  var weeklyResult = getWeeklyData();
  var weeklyData = weeklyResult.data;
  var startStr = weeklyResult.startStr;
  var endStr = weeklyResult.endStr;
  var pieData = getPieData();

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-semibold">Memuat data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">💰 Budget Tracker</h1>
          <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`p-3 rounded-lg flex items-center gap-2 ${a.type === 'danger' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                <AlertTriangle size={20} />
                <p className="text-sm font-medium">{a.message}</p>
              </div>
            ))}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <p className="text-xs text-gray-600">Pemasukan</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <p className="text-xs text-gray-600">Pengeluaran</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <p className="text-xs text-gray-600">Saldo</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-4 mb-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Zap size={24} />
              <span className="hidden sm:inline">Input Cepat - Langsung Banyak!</span>
              <span className="sm:hidden">Input Cepat</span>
            </h2>
            <button onClick={() => setShowBulkInput(!showBulkInput)} className="bg-white text-purple-600 px-3 py-2 rounded-lg text-sm font-semibold">
              {showBulkInput ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          {showBulkInput && (
            <>
              <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-3">
                <p className="text-xs mb-1">📝 Format: Deskripsi, Jumlah (bisa pakai k)</p>
                <p className="text-xs opacity-90">Contoh: makan, 15k</p>
              </div>
              <textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder="makan, 15k&#10;grab, 25k&#10;ortu, 1000k" className="w-full px-3 py-2 rounded-lg text-gray-800 h-24 resize-none text-sm" />
              <button onClick={handleBulkInput} className="w-full bg-white text-purple-600 font-bold py-2 rounded-lg mt-3">
                <Zap size={20} className="inline mr-2" />
                Tambahkan Semua Sekaligus!
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">📊 Grafik Mingguan</h2>
              <div className="flex gap-2">
                <button onClick={() => setChartWeekOffset(chartWeekOffset + 1)} className="px-2 py-1 bg-blue-500 text-white rounded text-xs">← Lalu</button>
                <button onClick={() => setChartWeekOffset(Math.max(0, chartWeekOffset - 1))} disabled={chartWeekOffset === 0} className={`px-2 py-1 rounded text-xs ${chartWeekOffset === 0 ? 'bg-gray-300 text-gray-500' : 'bg-blue-500 text-white'}`}>Depan →</button>
              </div>
            </div>
            <div className="mb-3 text-center">
              <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs">
                <Calendar size={14} />
                {startStr} - {endStr}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" style={{ fontSize: '10px' }} />
                <YAxis style={{ fontSize: '10px' }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Pemasukan" fill="#10b981" />
                <Bar dataKey="Pengeluaran" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">🥧 Breakdown Pengeluaran</h2>
            {pieData.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Belum ada data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={60} dataKey="value">
                      {pieData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {pieData.map((e, i) => (
                    <div key={e.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate">{e.name}: {formatCurrency(e.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target size={20} />
            Target Pengeluaran Tetap
          </h2>
          <div className="space-y-3 mb-4">
            {targets.map(tg => {
              const rem = tg.target - tg.spent;
              const pct = (tg.spent / tg.target) * 100;
              const over = tg.spent > tg.target;
              return (
                <div key={tg.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{tg.name}</h3>
                      <button onClick={() => setEditingTarget(tg.id)} className="text-blue-500">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => deleteTarget(tg.id)} className="text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                    {editingTarget === tg.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={tg.target} id={`edit-${tg.id}`} className="w-24 px-2 py-1 border rounded text-xs" />
                        <button onClick={() => updateTarget(tg.id, document.getElementById(`edit-${tg.id}`).value)} className="text-green-600">
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">Target: {formatCurrency(tg.target)}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Dikeluarkan: <span className="font-semibold text-red-600">{formatCurrency(tg.spent)}</span></span>
                      <span className={`font-semibold ${over ? 'text-red-600' : 'text-green-600'}`}>
                        {over ? 'Lebih' : 'Sisa'}: {formatCurrency(Math.abs(rem))}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">{pct.toFixed(1)}% dari target</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-3">
            <h3 className="font-semibold mb-2 text-sm">Tambah Target Baru</h3>
            <div className="flex gap-2">
              <input type="text" value={newTargetName} onChange={(e) => setNewTargetName(e.target.value)} placeholder="Nama target" className="flex-1 px-3 py-2 border rounded text-sm" />
              <input type="number" value={newTargetAmount} onChange={(e) => setNewTargetAmount(e.target.value)} placeholder="Jumlah" className="w-28 px-3 py-2 border rounded text-sm" />
              <button onClick={addTarget} className="bg-blue-600 text-white px-3 py-2 rounded">
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">Input Manual</h2>
            <div className="space-y-3">
              <select value={type} onChange={(e) => { setType(e.target.value); setCategory(categories[e.target.value][0]); }} className="w-full px-3 py-2 border rounded text-sm">
                <option value="pengeluaran">Pengeluaran</option>
                <option value="pemasukan">Pemasukan</option>
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
                {categories[type].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi" className="w-full px-3 py-2 border rounded text-sm" />
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Jumlah (Rp)" className="w-full px-3 py-2 border rounded text-sm" />
              <button onClick={handleAddTrans} className="w-full bg-blue-600 text-white font-semibold py-2 rounded flex items-center justify-center gap-2">
                <Plus size={18} />
                Tambah Transaksi
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Riwayat Transaksi
                <Filter size={16} className="text-gray-500" />
              </h2>
              <button onClick={exportCSV} className="bg-green-600 text-white px-3 py-2 rounded text-xs flex items-center gap-1">
                <Download size={14} />
                Export
              </button>
            </div>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari..." className="w-full pl-8 pr-3 py-2 border rounded text-sm" />
              </div>
            </div>
            <div className="mb-3 p-3 bg-gray-50 rounded space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full px-2 py-1 border rounded text-xs" />
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full px-2 py-1 border rounded text-xs" />
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-2 py-1 border rounded text-xs">
                <option value="all">Semua Kategori</option>
                {[...categories.pengeluaran, ...categories.pemasukan].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(filterStartDate || filterEndDate || searchQuery || filterCategory !== 'all') && (
                <button onClick={clearFilters} className="w-full text-xs text-blue-600 font-medium">Reset Filter</button>
              )}
            </div>
            {filteredTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Belum ada transaksi</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${t.type === 'pemasukan' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.category}
                        </span>
                        <span className="text-xs text-gray-500">{t.date}</span>
                      </div>
                      <p className="font-medium text-xs mt-1">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${t.type === 'pemasukan' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                      </p>
                      <button onClick={() => deleteTrans(t.id)} className="text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


