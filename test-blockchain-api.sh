#!/bin/bash
API_URL="http://localhost:3000"
REFRESH_INTERVAL=5  # seconds between status checks
MAX_ITERATIONS=100  # set to -1 for infinite monitoring

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear_screen() {
    clear
}

format_json() {
    # Check if jq is installed
    if command -v jq &> /dev/null; then
        echo "$1" | jq '.'
    else
        echo "$1"
    fi
}

get_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

get_stats() {
    curl -s -X GET "${API_URL}/stats"
}

# Function to get health status
get_health() {
    curl -s -X GET "${API_URL}/health"
}

# Function to extract values from JSON
extract_value() {
    local json="$1"
    local key="$2"
    
    if command -v jq &> /dev/null; then
        echo "$json" | jq -r ".$key"
    else
        echo "$json" | grep -o "\"$key\":[^,}]*" | cut -d":" -f2 | tr -d '"' | tr -d '{'
    fi
}

# Function to draw progress bar
draw_progress_bar() {
    local percent=$1
    local width=50
    local num_filled=$(( width * percent / 100 ))
    local num_empty=$(( width - num_filled ))
    
    # Print the progress bar
    printf "["
    printf "%${num_filled}s" | tr ' ' '#'
    printf "%${num_empty}s" | tr ' ' ' '
    printf "] %d%%\n" $percent
}

# Function to calculate percentage
calc_percentage() {
    local current=$1
    local total=$2
    
    if [ "$total" -eq 0 ]; then
        echo 0
    else
        echo $(( current * 100 / total ))
    fi
}

# get latest block from Infura
get_latest_block() {
    # Use INFURA_API_KEY from environment variable or default to empty
    local infura_api_key=${INFURA_API_KEY:-"40a8c78583924563b907e265eba0b41f"}
    local infura_url="https://mainnet.infura.io/v3/${infura_api_key}"
    
    # Create JSON-RPC request for eth_blockNumber
    local request_body='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
    
    # Make POST request to Infura endpoint
    local response=$(curl -s -X POST -H "Content-Type: application/json" --data "$request_body" "$infura_url")
    
    # Extract the hex result
    local hex_block=$(echo "$response" | grep -o '"result":"0x[^"]*"' | sed 's/"result":"0x//g' | sed 's/"//g')
    
    # Convert hex to decimal, or return "Unknown" if conversion fails
    if [ -n "$hex_block" ]; then
        printf "%d\n" 0x$hex_block 2>/dev/null || echo "Unknown"
    else
        echo "Unknown (Error: $(echo "$response" | grep -o '"error":[^}]*}' || echo "No response from Infura")"
    fi
}

# service status
display_status() {
    local health_data="$1"
    local stats_data="$2"
    local chain_latest_block="$3"
    local api_status=$(extract_value "$health_data" "status")
    local db_status=$(extract_value "$health_data" "services.database.status")
    local blockchain_status=$(extract_value "$health_data" "services.blockchain.status")
    local rabbitmq_status=$(extract_value "$health_data" "services.rabbitmq.status")
    local current_block=$(extract_value "$health_data" "services.blockchain.blockNumber")
    local total_blocks=$(extract_value "$stats_data" "totalBlocks")
    local total_transactions=$(extract_value "$stats_data" "totalTransactions")
    local total_amount=$(extract_value "$stats_data" "totalAmount")
    local indexing_percent=$(calc_percentage $total_blocks $chain_latest_block)
    
    clear_screen
    echo -e "${BLUE}===============================================${NC}"
    echo -e "${BLUE}     BLOCKCHAIN EXPLORER INDEXER MONITOR${NC}"
    echo -e "${BLUE}===============================================${NC}"
    echo -e "${YELLOW}Last Updated:${NC} $(get_timestamp)"
    echo ""
    
    # Service
    echo -e "${CYAN}SERVICE STATUS:${NC}"
    echo -e "API Service:     $([ "$api_status" = "UP" ] && echo -e "${GREEN}●${NC} Running" || echo -e "${RED}●${NC} Down")"
    echo -e "Database:        $([ "$db_status" = "UP" ] && echo -e "${GREEN}●${NC} Connected" || echo -e "${RED}●${NC} Disconnected")"
    echo -e "Blockchain Node: $([ "$blockchain_status" = "UP" ] && echo -e "${GREEN}●${NC} Connected" || echo -e "${RED}●${NC} Disconnected")"
    echo -e "RabbitMQ:        $([ "$rabbitmq_status" = "UP" ] && echo -e "${GREEN}●${NC} Connected" || echo -e "${RED}●${NC} Disconnected")"
    echo ""
    
    # Indexer
    echo -e "${CYAN}INDEXING PROGRESS:${NC}"
    echo -e "Latest Chain Block:   ${YELLOW}$chain_latest_block${NC}"
    echo -e "Current Node Block:   ${YELLOW}$current_block${NC}"
    echo -e "Total Indexed Blocks: ${YELLOW}$total_blocks${NC}"
    echo ""
    echo -e "Indexing Progress (${indexing_percent}%):"
    draw_progress_bar $indexing_percent
    echo ""
    
    # Db
    echo -e "${CYAN}DATABASE STATISTICS:${NC}"
    echo -e "Total Blocks:       ${YELLOW}$total_blocks${NC}"
    echo -e "Total Transactions: ${YELLOW}$total_transactions${NC}"
    echo -e "Total Amount:       ${YELLOW}$total_amount${NC}"
    echo ""
    
    echo -e "${BLUE}===============================================${NC}"
    echo -e "Press Ctrl+C to exit monitoring"
}

monitor() {
    local iteration=0
    
    while [ $MAX_ITERATIONS -eq -1 ] || [ $iteration -lt $MAX_ITERATIONS ]; do
        # from API
        local health_data=$(get_health)
        local stats_data=$(get_stats)
        local chain_latest_block=$(get_latest_block)
        
        display_status "$health_data" "$stats_data" "$chain_latest_block"
        
        sleep $REFRESH_INTERVAL
        
        ((iteration++))
    done
}

echo "Starting Blockchain Explorer Indexer Monitor..."
monitor