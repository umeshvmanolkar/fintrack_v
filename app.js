// Mock State (Mirrors the React state)
const state = {
    currentTab: 'earnings',
    expandedGoalId: null,

    goals: [
        { id: 1, name: 'emi', target: 5000, current: 300, deadline: '' },
        { id: 2, name: 'bike', target: 100000, current: 3500, deadline: '' }
    ],

    earnings: [
        { id: 1, source: 'Freelance', category: 'Freelance', amount: 1500, time: '10:30 AM', goalId: 1, date: '2026-02-27', type: 'earn' },
        { id: 2, source: 'Salary', category: 'Salary', amount: 2000, time: '2:15 PM', goalId: 2, date: '2026-02-27', type: 'earn' },
        { id: 3, source: 'Trading', category: 'Trading', amount: 300, time: '9:00 AM', goalId: null, date: '2026-02-26', type: 'earn' }
    ],

    loans: [
        { id: 1, source: 'Home Loan', principal: 200000, interestRate: 10, emi: 1, startDate: '', endDate: '', totalPaid: 10000, remainingBalance: 190000 }
    ],

    chartInstances: []
};

const CATEGORY_COLORS = {
    'Freelance': '#8b5cf6',
    'Salary': '#c084fc',
    'Trading': '#f59e0b',
    'Business': '#10b981',
    'Dividends': '#3b82f6',
    'Gifts': '#ec4899',
    'Other': '#64748b'
};

// --- Core App Management ---
const app = {
    init() {
        this.render();
    },

    switchTab(tabName) {
        state.currentTab = tabName;
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.getElementById(`nav-${tabName}`).classList.add('active');
        this.render();
    },

    destroyCharts() {
        state.chartInstances.forEach(chart => chart.destroy());
        state.chartInstances = [];
    },

    render() {
        this.destroyCharts();
        const mainContent = document.getElementById('app-content');
        mainContent.innerHTML = '';

        mainContent.classList.add('animate-fade-in');

        // Brief timeout to let the fade animation play on swap
        setTimeout(() => {
            mainContent.classList.remove('animate-fade-in');
        }, 400);

        if (state.currentTab === 'earnings') {
            mainContent.innerHTML = this.getEarningsHTML();
            this.initEarningsCharts();
        } else if (state.currentTab === 'loans') {
            mainContent.innerHTML = this.getLoansHTML();
        }

        // Re-initialize Lucide icons for dynamically injected content
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    // --- Formatters ---
    formatCurrency(amount) {
        return Math.round(amount).toLocaleString('en-IN');
    },

    getTodayStr() {
        return new Date().toISOString().split('T')[0];
    },

    getThisMonthStr() {
        return this.getTodayStr().substring(0, 7);
    },

    // --- Earnings Rendering Logic ---
    getEarningsHTML() {
        const todayStr = this.getTodayStr();
        const monthStr = this.getThisMonthStr();

        const totalEarned = state.earnings.filter(e => e.type === 'earn').reduce((acc, curr) => acc + curr.amount, 0);
        const thisMonth = state.earnings.filter(e => e.type === 'earn' && e.date.startsWith(monthStr)).reduce((acc, curr) => acc + curr.amount, 0);
        const today = state.earnings.filter(e => e.type === 'earn' && e.date === todayStr).reduce((acc, curr) => acc + curr.amount, 0);

        // Generate Goal HTML logic mimicking React component maps
        const goalsHTML = state.goals.map(goal => {
            const p = Math.min((goal.current / goal.target) * 100, 100);
            const isExpanded = state.expandedGoalId === goal.id;

            const goalActivity = state.earnings.filter(e => e.goalId === goal.id);
            const earnsToday = goalActivity.filter(e => e.type === 'earn' && e.date === todayStr).reduce((acc, curr) => acc + curr.amount, 0);
            const spendsToday = goalActivity.filter(e => e.type === 'spend' && e.date === todayStr).reduce((acc, curr) => acc + curr.amount, 0);
            const netToday = earnsToday - spendsToday;
            const dailyP = Math.min((netToday / goal.target) * 100, 100);

            const isNeg = netToday < 0;
            const todayClass = isNeg ? 'goal-card-today negative' : 'goal-card-today positive';
            const sign = isNeg ? '-' : '+';
            const numVal = Math.abs(netToday);

            let entriesHTML = '';
            if (isExpanded) {
                let listHTML = goalActivity.map(entry => {
                    const badgeClass = entry.type === 'spend' ? 'spend' : 'earn';
                    const listSign = entry.type === 'earn' ? '+' : '-';
                    const listColorStyle = entry.type === 'spend' ? 'color: var(--accent)' : 'color: var(--success)';
                    return `
                        <div class="flex justify-between items-center mb-2" style="padding: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                            <div class="flex items-center gap-3">
                                <span class="badge ${badgeClass}">${entry.category}</span>
                                <span class="text-muted" style="font-size: 0.8rem">${entry.date}</span>
                            </div>
                            <div style="font-weight: 600; ${listColorStyle}">${listSign}₹${this.formatCurrency(entry.amount)}</div>
                        </div>
                    `;
                }).join('');

                if (goalActivity.length === 0) listHTML = `<div class="text-center text-muted" style="font-size: 0.8rem; padding: 1rem 0;">No entries found.</div>`;

                entriesHTML = `
                    <div class="goal-card-entries animate-fade-in">
                        <div class="flex justify-between items-center mb-4 text-muted" style="font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em;">
                            <span>HISTORY LOG (${goalActivity.length})</span>
                            <button onclick="app.openEarningModal()" class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; gap: 0.2rem; border-color: var(--border-color);">
                                <i data-lucide="plus" style="width: 12px;"></i> Add
                            </button>
                        </div>
                        <div class="flex-col gap-2" style="max-height: 220px; overflow-y: auto; padding-right: 0.5rem;">
                            ${listHTML}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="goal-card">
                    <div class="goal-card-header">
                        <div class="flex justify-between items-start mb-2">
                            <h3>${goal.name}</h3>
                            <div class="flex gap-2">
                                <button class="btn-icon danger" onclick="app.deleteGoal(${goal.id})"><i data-lucide="trash-2" style="width:16px;"></i></button>
                            </div>
                        </div>
                        <div class="text-muted" style="font-size: 0.85rem;">Target: ₹${this.formatCurrency(goal.target)}</div>
                    </div>
                    
                    <div class="${todayClass}">
                        <span>TODAY ${sign}₹${this.formatCurrency(numVal)}</span>
                        <span>${Math.abs(dailyP).toFixed(2)}% of goal</span>
                    </div>

                    <div class="goal-card-progress">
                        <div style="width: 70%;">
                            <div style="color: var(--text-main); font-weight: 600; margin-bottom: 0.5rem; font-size: 1.1rem;">
                                ₹${this.formatCurrency(goal.current)} <span class="text-primary">(${p.toFixed(1)}%)</span>
                            </div>
                            <div class="progress-bg mt-1" style="width: 100%;">
                                <div class="progress-fill" style="width: ${p}%;"></div>
                            </div>
                        </div>
                        <div class="text-muted text-right">₹${this.formatCurrency(goal.target)}</div>
                    </div>

                    <div class="goal-card-toggle flex items-center justify-center gap-1" onclick="app.toggleGoal(${goal.id})">
                        ${isExpanded ? 'Hide entries <i data-lucide="chevron-up" style="width:16px;"></i>' : 'Show entries <i data-lucide="chevron-down" style="width:16px;"></i>'}
                    </div>

                    ${entriesHTML}
                </div>
            `;
        }).join('');

        return `
            <!-- Top Dashboard Stats -->
            <div class="grid grid-cols-4 gap-4 mb-8">
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-green"><i data-lucide="trending-up"></i></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">Total Earned</p>
                        <h2 style="margin-top: 0.2rem">₹${this.formatCurrency(totalEarned)}</h2>
                    </div>
                </div>
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-blue"><i data-lucide="calendar"></i></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">This Month</p>
                        <h2 style="margin-top: 0.2rem">₹${this.formatCurrency(thisMonth)}</h2>
                    </div>
                </div>
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-teal"><i data-lucide="trending-up"></i></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">Today</p>
                        <h2 style="margin-top: 0.2rem">₹${this.formatCurrency(today)}</h2>
                    </div>
                </div>
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-purple"><i data-lucide="target"></i></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">Active Goals</p>
                        <h2 style="margin-top: 0.2rem">${state.goals.length}</h2>
                    </div>
                </div>
            </div>

            <!-- Charts Area -->
            <div class="grid grid-cols-3 gap-6 mb-8">
                <div class="card" style="grid-column: span 2;">
                    <div class="flex justify-between items-center mb-6">
                        <h3>Earnings Over Time</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="lineChart"></canvas>
                    </div>
                </div>
                
                <div class="card flex-col items-center justify-center">
                    <h3 style="margin-bottom: 1.5rem; align-self: flex-start;">By Category</h3>
                    <div class="donut-container flex items-center justify-center">
                        <canvas id="donutChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Earning Goals Title Row -->
            <div class="flex justify-between items-center mb-6">
                <h2>Earning Goals</h2>
                <div class="flex gap-3">
                    <button class="btn btn-outline" style="color: var(--accent); border-color: rgba(244, 63, 94, 0.4);" onclick="app.openWithdrawModal()">
                        <i data-lucide="arrow-down-right" style="width: 18px;"></i> Spend / Withdraw
                    </button>
                    <button class="btn btn-primary" onclick="app.openGoalModal()">
                        <i data-lucide="plus" style="width: 18px;"></i> Add Goal
                    </button>
                </div>
            </div>

            <!-- Insert dynamically built Goal Cards -->
            <div class="grid grid-cols-3 gap-6">
                ${goalsHTML}
            </div>
        `;
    },

    // --- Chart JS Wrapper ---
    initEarningsCharts() {
        // Line Chart Mock Data
        const lineCtx = document.getElementById('lineChart');
        if (lineCtx) {
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.font.family = "'Outfit', sans-serif";

            state.chartInstances.push(new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: ['22 Feb', '23 Feb', '24 Feb', '25 Feb', '26 Feb', '27 Feb'],
                    datasets: [
                        {
                            label: 'Cumulative',
                            data: [500, 700, 700, 1500, 1800, 5300],
                            borderColor: '#8b5cf6',
                            borderWidth: 3,
                            pointBackgroundColor: '#8b5cf6',
                            tension: 0.4
                        },
                        {
                            label: 'Daily',
                            data: [0, 200, 0, 800, 300, 3500],
                            borderColor: '#10b981',
                            borderDash: [5, 5],
                            borderWidth: 2,
                            pointBackgroundColor: '#10b981',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
                        tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', titleColor: '#fff', bodyColor: '#fff', padding: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
                    },
                    scales: {
                        y: { border: { display: false }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { border: { display: false }, grid: { display: false } }
                    }
                }
            }));
        }

        // Donut Chart logic mapped from custom category array
        const donutCtx = document.getElementById('donutChart');
        if (donutCtx) {
            const categoryTotals = state.earnings.filter(e => e.type === 'earn').reduce((acc, curr) => {
                acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                return acc;
            }, {});

            const labels = Object.keys(categoryTotals);
            const dataValues = Object.values(categoryTotals);
            const colors = labels.map(label => CATEGORY_COLORS[label] || CATEGORY_COLORS['Other']);

            state.chartInstances.push(new Chart(donutCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: colors,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, padding: 20 } },
                        tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', titleColor: '#fff', bodyColor: '#fff', padding: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
                    }
                }
            }));
        }
    },

    // --- Loans Rendering Logic ---
    getLoansHTML() {
        const totalDebt = state.loans.reduce((acc, l) => acc + l.remainingBalance, 0);
        const totalPrincipal = state.loans.reduce((acc, l) => acc + l.principal, 0);
        const totalEmi = state.loans.reduce((acc, l) => acc + l.emi, 0);

        const activeLoansHTML = state.loans.map(loan => {
            const payoffP = (loan.principal > 0) ? Math.min((loan.totalPaid / loan.principal) * 100, 100) : 0;
            return `
                <div class="card" style="padding: 1.5rem; background: rgba(30, 41, 59, 0.5);">
                    <div class="flex justify-between items-start mb-6">
                        <h3>${loan.source}</h3>
                        <div class="flex gap-2">
                            <button onclick="app.openEmiModal(${loan.id})" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); cursor: pointer; padding: 0.35rem 0.5rem; font-size: 0.75rem;">Edit / Pay</button>
                            <button class="btn-icon danger" onclick="app.deleteLoan(${loan.id})" style="margin-left: 0.5rem;"><i data-lucide="trash-2" style="width:16px;"></i></button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-8">
                        <div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem; text-transform: uppercase;">Total Amount</div>
                            <div style="font-weight: 600; font-size: 1.1rem;">₹${this.formatCurrency(loan.principal)}</div>
                        </div>
                        <div>
                            <div class="text-warning mb-1" style="font-size: 0.75rem; text-transform: uppercase;">Remaining</div>
                            <div class="text-warning" style="font-weight: 600; font-size: 1.1rem;">₹${this.formatCurrency(loan.remainingBalance)}</div>
                        </div>
                        <div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem; text-transform: uppercase;">Interest Rate</div>
                            <div style="font-weight: 600;">${loan.interestRate}%</div>
                        </div>
                        <div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem; text-transform: uppercase;">Monthly EMI</div>
                            <div style="font-weight: 600;">₹${this.formatCurrency(loan.emi)}</div>
                        </div>
                        <div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem; text-transform: uppercase;">Start Date</div>
                            <div style="font-weight: 500; color: var(--text-muted);">${loan.startDate || '-'}</div>
                        </div>
                        <div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem; text-transform: uppercase;">End Date</div>
                            <div style="font-weight: 500; color: var(--text-muted);">${loan.endDate || '-'}</div>
                        </div>
                    </div>

                    <div style="border-top: 1px solid var(--border-darker); padding-top: 1.25rem;">
                        <div class="flex justify-between items-end mb-2" style="font-size: 0.85rem;">
                            <span class="text-primary" style="font-weight: 600;">Paid ₹${this.formatCurrency(loan.totalPaid)} <span class="opacity-50">(${payoffP.toFixed(1)}%)</span></span>
                            <span class="text-muted">₹${this.formatCurrency(loan.principal)}</span>
                        </div>
                        <div class="progress-bg">
                            <div class="progress-fill" style="width: ${payoffP}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const emptyHTML = state.loans.length === 0 ? `
            <div class="card text-center text-muted" style="grid-column: 1 / -1; padding: 4rem 2rem;">
                <i data-lucide="wallet-cards" style="width: 48px; height: 48px; margin: 0 auto 1.5rem; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem;">No active loans registered.</p>
            </div>
        ` : '';

        return `
            <div class="grid grid-cols-4 gap-4 mb-8 mt-2">
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-red"><i data-lucide="wallet-cards"></i></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">Total Loans</p>
                        <h2 style="margin-top: 0.2rem">${state.loans.length}</h2>
                    </div>
                </div>
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-orange"><h2>₹</h2></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">Total Amount</p>
                        <h2 style="margin-top: 0.2rem">₹${this.formatCurrency(totalPrincipal)}</h2>
                    </div>
                </div>
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-green"><h2>₹</h2></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">Total Remaining</p>
                        <h2 style="margin-top: 0.2rem">₹${this.formatCurrency(totalDebt)}</h2>
                    </div>
                </div>
                <div class="card flex items-center gap-4">
                    <div class="icon-box icon-box-teal"><i data-lucide="calendar"></i></div>
                    <div>
                        <p class="text-muted" style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">Monthly EMI</p>
                        <h2 style="margin-top: 0.2rem">₹${this.formatCurrency(totalEmi)}</h2>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center mb-6">
                <h2>Your Loans</h2>
                <button class="btn btn-primary" onclick="app.openLoanModal()">
                    <i data-lucide="plus" style="width: 16px;"></i> Add Loan
                </button>
            </div>

            <div class="grid grid-cols-3 gap-6">
                ${activeLoansHTML}
                ${emptyHTML}
            </div>
        `;
    },

    // --- State Mutations ---
    toggleGoal(id) {
        state.expandedGoalId = state.expandedGoalId === id ? null : id;
        this.render();
    },

    deleteGoal(id) {
        if (confirm('Are you sure you want to delete this goal?')) {
            state.goals = state.goals.filter(g => g.id !== id);
            if (state.expandedGoalId === id) state.expandedGoalId = null;
            this.render();
        }
    },

    deleteLoan(id) {
        if (confirm('Delete this loan entirely?')) {
            state.loans = state.loans.filter(l => l.id !== id);
            this.render();
        }
    },

    submitEarning(e) {
        e.preventDefault();
        const fd = new FormData(e.target);

        const newEarn = {
            id: Date.now(),
            source: fd.get('source'),
            category: fd.get('category'),
            amount: parseFloat(fd.get('amount')),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: this.getTodayStr(),
            goalId: fd.get('goalId') ? parseInt(fd.get('goalId')) : null,
            type: 'earn'
        };

        state.earnings.unshift(newEarn);

        if (newEarn.goalId) {
            const goal = state.goals.find(g => g.id === newEarn.goalId);
            if (goal) goal.current += newEarn.amount;
        }

        this.closeModal();
        this.render();
    },

    submitGoal(e) {
        e.preventDefault();
        const fd = new FormData(e.target);

        state.goals.push({
            id: Date.now(),
            name: fd.get('name'),
            target: parseFloat(fd.get('target')),
            current: 0,
            deadline: ''
        });

        this.closeModal();
        this.render();
    },

    submitWithdrawal(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const amountStr = fd.get('amount');
        const goalIdStr = fd.get('goalId');

        if (!amountStr || !goalIdStr) return;

        const amt = parseFloat(amountStr);
        const goalIdInt = parseInt(goalIdStr);

        state.earnings.unshift({
            id: Date.now(),
            source: fd.get('reason'),
            category: 'Spend',
            amount: amt,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: this.getTodayStr(),
            goalId: goalIdInt,
            type: 'spend'
        });

        const goal = state.goals.find(g => g.id === goalIdInt);
        if (goal) goal.current = Math.max(0, goal.current - amt);

        this.closeModal();
        this.render();
    },

    submitLoan(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const prin = parseFloat(fd.get('principal')) || 0;

        state.loans.push({
            id: Date.now(),
            source: fd.get('source') || 'Unnamed Loan',
            principal: prin,
            interestRate: parseFloat(fd.get('interestRate')) || 0,
            emi: parseFloat(fd.get('emi')) || 0,
            startDate: fd.get('startDate') || '',
            endDate: fd.get('endDate') || '',
            totalPaid: 0,
            remainingBalance: prin
        });

        this.closeModal();
        this.render();
    },

    submitEmi(e, id) {
        e.preventDefault();
        const amt = parseFloat(new FormData(e.target).get('amount'));
        const loan = state.loans.find(l => l.id === id);
        if (loan && amt) {
            const mRate = (loan.interestRate / 100) / 12;
            const iComp = loan.remainingBalance * mRate;
            const pComp = amt - iComp;

            loan.totalPaid += amt;
            loan.remainingBalance = Math.max(0, loan.remainingBalance - pComp);
        }
        this.closeModal();
        this.render();
    },

    // --- Modals Engine ---
    openModal(title, formHTML) {
        const container = document.getElementById('modal-container');
        const content = document.getElementById('dynamic-modal');

        content.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="btn-icon muted" onclick="app.closeModal()"><i data-lucide="x" style="width: 20px;"></i></button>
            </div>
            ${formHTML}
        `;

        container.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    },

    closeModal() {
        document.getElementById('modal-container').classList.add('hidden');
    },

    openEarningModal() {
        const goalOptions = state.goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        this.openModal('Log New Earning', `
            <form onsubmit="app.submitEarning(event)">
                <div class="form-group">
                    <label class="form-label">Title / Source</label>
                    <input type="text" name="source" class="form-control" placeholder="e.g. Contract Work" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Amount (₹)</label>
                        <input type="number" name="amount" step="0.01" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select name="category" class="form-control">
                            <option value="Freelance">Freelance</option>
                            <option value="Salary">Salary</option>
                            <option value="Business">Business</option>
                            <option value="Trading">Trading</option>
                            <option value="Dividends">Dividends</option>
                            <option value="Gifts">Gifts</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Assign to Goal (Optional)</label>
                    <select name="goalId" class="form-control">
                        <option value="">-- No specific goal --</option>
                        ${goalOptions}
                    </select>
                </div>
                <button type="submit" class="btn btn-primary mt-4" style="width: 100%;">Save Earning</button>
            </form>
        `);
    },

    openGoalModal() {
        this.openModal('Create New Goal', `
            <form onsubmit="app.submitGoal(event)">
                <div class="form-group">
                    <label class="form-label">Goal Name</label>
                    <input type="text" name="name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Target Amount (₹)</label>
                    <input type="number" name="target" step="0.01" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary mt-4" style="width: 100%;">Create Goal</button>
            </form>
        `);
    },

    openWithdrawModal() {
        const arr = state.goals.map(g => `<option value="${g.id}">${g.name} (Avail: ₹${this.formatCurrency(g.current)})</option>`).join('');
        this.openModal('Log Spend / Withdraw Tracking', `
            <form onsubmit="app.submitWithdrawal(event)">
                <div class="form-group">
                    <label class="form-label">Withdraw From Associated Goal</label>
                    <select name="goalId" class="form-control" required>
                        <option value="" disabled selected>-- Select target goal --</option>
                        ${arr}
                    </select>
                    <span class="text-muted mt-1" style="font-size: 0.75rem;">This explicit spend will be tracked inside the goal's history.</span>
                </div>
                <div class="form-group">
                    <label class="form-label">Short Reason / Item</label>
                    <input type="text" name="reason" class="form-control" placeholder="e.g. Bought bike parts" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Amount Spent (₹)</label>
                    <input type="number" name="amount" step="0.01" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary mt-4" style="width: 100%; background: var(--accent); box-shadow: 0 4px 14px rgba(244, 63, 94, 0.4);">Confirm Spend</button>
            </form>
        `);
    },

    openLoanModal() {
        this.openModal('Add New Loan', `
            <form onsubmit="app.submitLoan(event)">
                <div class="form-group">
                    <label class="form-label">Loan Source Title</label>
                    <input type="text" name="source" class="form-control" placeholder="e.g. Home Loan" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group"><label class="form-label">Total Amount (₹)</label><input type="number" name="principal" class="form-control" required></div>
                    <div class="form-group"><label class="form-label">Interest Rate (%)</label><input type="number" name="interestRate" step="0.01" class="form-control" required></div>
                </div>
                <div class="form-group"><label class="form-label">Monthly EMI (₹)</label><input type="number" name="emi" class="form-control" required></div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group"><label class="form-label">Start Date</label><input type="date" name="startDate" class="form-control"></div>
                    <div class="form-group"><label class="form-label">End Date</label><input type="date" name="endDate" class="form-control"></div>
                </div>
                <button type="submit" class="btn btn-primary mt-4" style="width: 100%;">Save Loan</button>
            </form>
        `);
    },

    openEmiModal(id) {
        this.openModal('Record EMI / Payment', `
            <form onsubmit="app.submitEmi(event, ${id})">
                <div class="form-group">
                    <label class="form-label">Payment Amount (₹)</label>
                    <input type="number" name="amount" step="0.01" class="form-control" required>
                </div>
                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">This payment recalculates your remaining balance considering the interest component.</p>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Confirm Payment</button>
            </form>
        `);
    }
};

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
