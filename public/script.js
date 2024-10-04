document.addEventListener('DOMContentLoaded', (event) => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    const addSymbolForm = document.getElementById('addSymbolForm');

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
    });

    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        body.classList.add('dark-mode');
    }

    async function updateTradingSymbols() {
        try {
            const response = await fetch('/config/symbols');
            const symbols = await response.json();
            console.log('Received symbols:', symbols);
            const symbolsList = document.querySelector('#tradingSymbols ul');
            symbolsList.innerHTML = '';
            symbols.forEach(symbol => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="symbol">${symbol}</span>`;
                symbolsList.appendChild(li);
            });
        } catch (error) {
            console.error('Error updating trading symbols:', error);
        }
    }

    // Call updateTradingSymbols when the page loads
    updateTradingSymbols();

    // Handle adding new symbols
    addSymbolForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newSymbol = document.getElementById('newSymbol').value.toUpperCase();
        try {
            const response = await fetch('/config/symbols', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbols: [newSymbol] }),
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Server response:', data);
                document.getElementById('newSymbol').value = '';
                // Update the trading symbols list with the response from the server
                const symbolsList = document.querySelector('#tradingSymbols ul');
                symbolsList.innerHTML = '';
                data.symbols.forEach(symbol => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="symbol">${symbol}</span>`;
                    symbolsList.appendChild(li);
                });
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

    // Update portfolio and recent trades every 30 seconds
    setInterval(() => {
        updatePortfolio();
        updateRecentTrades();
    }, 30000);
});