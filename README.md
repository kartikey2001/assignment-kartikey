# Advanced Trading Bot Dashboard

## Created by Kartikey Agrawal

## Table of Contents
1. [Introduction](#introduction)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup and Installation](#setup-and-installation)
6. [Configuration](#configuration)
7. [Usage](#usage)
8. [API Endpoints](#api-endpoints)
9. [Trading Strategy](#trading-strategy)
10. [Database Schema](#database-schema)
11. [Real-time Updates](#real-time-updates)
12. [Error Handling and Logging](#error-handling-and-logging)
13. [Security Considerations](#security-considerations)
14. [Performance Optimization](#performance-optimization)
15. [Future Enhancements](#future-enhancements)

## Introduction

The Advanced Trading Bot Dashboard is a sophisticated, full-stack application designed to simulate and visualize algorithmic trading strategies. This project leverages real-time financial data from the Finnhub API to execute trades based on customizable parameters, providing users with an intuitive interface to monitor portfolio performance, analyze trade history, and adjust bot settings on-the-fly.

I have created this assignment for the role of Backend Developer at Probo.

## Features

- Real-time stock price fetching and trading simulation
- Dynamic portfolio management and valuation
- Interactive dashboard with dark mode support
- Customizable trading bot settings (buy/sell thresholds)
- Historical performance tracking and visualization
- Real-time trade execution and logging
- Symbol management (add/delete trading symbols)
- Responsive design for various device sizes
- Automatic scheduled trading using cron jobs

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: MongoDB with Mongoose ORM
- **Real-time Data**: Finnhub API
- **Charting**: Chart.js
- **Task Scheduling**: node-cron
- **Templating Engine**: EJS
- **Logging**: Winston
- **Environment Variables**: dotenv
- **Version Control**: Git

## Project Structure
trading-bot-dashboard/
│
├── public/
│ ├── styles.css
│ └── script.js
│
├── views/
│ └── dashboard.ejs
│
├── .env
├── .env.example
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
└── README.md


## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/kartikey2001/assignment-kartikey.git
   ```

2. Navigate to the project directory:
   ```
   cd assignment-kartikey
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required values in `.env`

5. Start the server:
   ```
   node index.js
   ```

## Configuration

The application uses the following environment variables:

- `PORT`: The port on which the server will run
- `MONGODB_URI`: MongoDB connection string
- `FINNHUB_API_KEY`: API key for Finnhub

## Usage

1. Access the dashboard at `http://localhost:3000` (or your configured port)
2. Use the interface to add trading symbols, adjust bot settings, and monitor performance
3. The bot will automatically execute trades based on the configured settings

## API Endpoints

- GET `/dashboard`: Renders the main dashboard
- GET `/price/:symbol`: Fetches the latest price for a given symbol
- GET `/trade/:symbol`: Executes a trade for the given symbol
- GET `/performance`: Retrieves historical performance data
- GET `/portfolio`: Fetches current portfolio status
- GET `/trades`: Retrieves recent trade history
- POST `/config/symbols`: Adds new trading symbols
- DELETE `/config/symbols`: Removes a trading symbol
- GET `/bot/settings`: Retrieves current bot settings
- POST `/bot/settings`: Updates bot settings

## Trading Strategy

The bot implements a simple moving average crossover strategy:
- Buy when the price drops below the buy threshold (default -2%)
- Sell when the price rises above the sell threshold (default +3%)

The strategy can be customized through the bot settings interface.

## Database Schema

The application uses the following MongoDB schemas:

- `Trade`: Stores individual trade records
- `Portfolio`: Tracks current balance and positions
- `Performance`: Records daily portfolio performance
- `Config`: Stores configuration data including trading symbols
- `BotSettings`: Stores bot trading parameters

## Real-time Updates

The dashboard implements real-time updates using:
- Periodic API calls to Finnhub for price updates
- Scheduled tasks using node-cron for trade execution
- Client-side polling for updating the UI

## Error Handling and Logging

- Comprehensive error handling throughout the application
- Detailed logging using Winston, with separate logs for errors and combined events
- User-friendly error messages on the frontend

## Security Considerations

- Environment variables for sensitive data
- Input validation and sanitization
- CORS protection
- Rate limiting on API endpoints (TODO)

## Performance Optimization

- Efficient database queries using Mongoose
- Caching of frequently accessed data (TODO)
- Optimized frontend assets (TODO)

## Future Enhancements

- Implement additional trading strategies
- Add user authentication and multi-user support
- Integrate with additional data sources
- Implement backtesting functionality
- Add email/SMS alerts for significant events