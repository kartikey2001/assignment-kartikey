document.addEventListener('DOMContentLoaded', (event) => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    const addSymbolForm = document.getElementById('addSymbolForm');
    const botSettingsForm = document.getElementById('botSettingsForm');
    let portfolioChart;

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
        updateChartTheme();
    });

    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        body.classList.add('dark-mode');
    }

    async function updateTradingSymbols() {
        try {
            const response = await fetch('/symbols');
            const symbols = await response.json();
            console.log('Received symbols:', symbols);
            const symbolsList = document.querySelector('#tradingSymbols ul');
            symbolsList.innerHTML = '';
            symbols.forEach(symbol => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="symbol">${symbol}</span>
                    <span class="price" data-symbol="${symbol}">Loading...</span>
                    <button class="deleteSymbol" data-symbol="${symbol}">Delete</button>
                `;
                symbolsList.appendChild(li);
            });
            updatePrices();
            addDeleteListeners();
        } catch (error) {
            console.error('Error updating trading symbols:', error);
        }
    }

    function addDeleteListeners() {
        const deleteButtons = document.querySelectorAll('.deleteSymbol');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const symbol = e.target.dataset.symbol;
                try {
                    const response = await fetch('/symbols', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ symbol }),
                    });
                    if (response.ok) {
                        await updateTradingSymbols();
                        console.log(`Symbol ${symbol} deleted`);
                    } else {
                        alert('Failed to delete symbol');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('An error occurred while deleting the symbol');
                }
            });
        });
    }

    async function updatePrices() {
        const priceElements = document.querySelectorAll('.price');
        for (const element of priceElements) {
            const symbol = element.dataset.symbol;
            try {
                const response = await fetch(`/price/${symbol}`);
                const data = await response.json();
                element.textContent = `$${data.price.toFixed(2)}`;
            } catch (error) {
                console.error(`Error fetching price for ${symbol}:`, error);
                element.textContent = 'Error';
            }
        }
    }

    // Call updateTradingSymbols when the page loads
    updateTradingSymbols();

    // Handle adding new symbols
    addSymbolForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newSymbol = document.getElementById('newSymbol').value.toUpperCase();
        try {
            const response = await fetch('/symbols', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbol: newSymbol }),
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Server response:', data);
                document.getElementById('newSymbol').value = '';
                await updateTradingSymbols();
                console.log('Symbol added and list updated');
            } else {
                alert('Failed to add symbol');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the symbol');
        }
    });

    // Function to update portfolio
    async function updatePortfolio() {
        try {
            const response = await fetch('/portfolio');
            const data = await response.json();
            document.getElementById('balance').textContent = data.balance.toFixed(2);
            document.getElementById('totalValue').textContent = data.totalValue.toFixed(2);
            document.getElementById('profitLoss').textContent = data.profitLoss.toFixed(2);
            const positionsList = document.getElementById('positions');
            positionsList.innerHTML = '';
            for (const [symbol, details] of Object.entries(data.positions)) {
                const li = document.createElement('li');
                li.innerHTML = `<span class="symbol">${symbol}</span>: ${details.quantity} (Value: $${details.value.toFixed(2)})`;
                positionsList.appendChild(li);
            }
        } catch (error) {
            console.error('Error updating portfolio:', error);
        }
    }

    // Function to update recent trades
    async function updateRecentTrades() {
        try {
            const response = await fetch('/trades');
            const trades = await response.json();
            const tradesList = document.querySelector('#recentTrades ul');
            tradesList.innerHTML = '';
            trades.forEach(trade => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="date">${new Date(trade.timestamp).toLocaleString()}</span> - 
                    <span class="${trade.type}">${trade.type}</span> 
                    ${trade.quantity} <span class="symbol">${trade.symbol}</span> 
                    at $${trade.price.toFixed(2)}
                `;
                tradesList.appendChild(li);
            });
        } catch (error) {
            console.error('Error updating recent trades:', error);
        }
    }

    // Function to update performance chart
    async function updatePerformanceChart() {
        try {
            const response = await fetch('/performance');
            const performances = await response.json();
            const dates = performances.map(p => new Date(p.date).toLocaleDateString());
            const totalValues = performances.map(p => p.totalValue);

            if (portfolioChart) {
                portfolioChart.destroy();
            }

            const ctx = document.getElementById('portfolioChart').getContext('2d');
            portfolioChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Portfolio Value',
                        data: totalValues,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });

            updateChartTheme();
        } catch (error) {
            console.error('Error updating performance chart:', error);
        }
    }

    function updateChartTheme() {
        if (!portfolioChart) return;

        const isDarkMode = body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#f4f4f4' : '#333';

        portfolioChart.options.scales.x.ticks.color = textColor;
        portfolioChart.options.scales.y.ticks.color = textColor;
        portfolioChart.options.plugins.legend.labels.color = textColor;
        portfolioChart.update();
    }

    // Handle bot settings form submission
    botSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const buyThreshold = parseFloat(document.getElementById('buyThreshold').value);
        const sellThreshold = parseFloat(document.getElementById('sellThreshold').value);
        try {
            const response = await fetch('/bot/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ buyThreshold, sellThreshold }),
            });
            const data = await response.json();
            if (response.ok) {
                alert('Bot settings updated successfully');
                // Update the form with the new values
                document.getElementById('buyThreshold').value = data.settings.buyThreshold;
                document.getElementById('sellThreshold').value = data.settings.sellThreshold;
            } else {
                alert(`Failed to update bot settings: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating bot settings:', error);
            alert('An error occurred while updating bot settings');
        }
    });

    // Add this function to fetch and display current bot settings
    async function updateBotSettings() {
        try {
            const response = await fetch('/bot/settings');
            const settings = await response.json();
            document.getElementById('buyThreshold').value = settings.buyThreshold.toFixed(1);
            document.getElementById('sellThreshold').value = settings.sellThreshold.toFixed(1);
        } catch (error) {
            console.error('Error fetching bot settings:', error);
        }
    }

    // Call this function when the page loads
    updateBotSettings();

    // Update data every 30 seconds
    setInterval(() => {
        updatePortfolio();
        updateRecentTrades();
        updatePrices();
        updatePerformanceChart();
    }, 30000);

    // Initial updates
    updatePortfolio();
    updateRecentTrades();
    updatePerformanceChart();

    // Call addDeleteListeners when the page loads
    addDeleteListeners();
});