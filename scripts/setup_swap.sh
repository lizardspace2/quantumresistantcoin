#!/bin/bash

# Check if swapfile already exists
if [ -f /swapfile ]; then
    echo "Swapfile already exists."
else
    echo "Creating 2G swapfile..."
    # Create a 2GB file
    sudo fallocate -l 2G /swapfile
    
    # Set correct permissions
    sudo chmod 600 /swapfile
    
    # Setup swap area
    sudo mkswap /swapfile
    
    # Enable swap
    sudo swapon /swapfile
    
    # Make persistent
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    
    echo "Swap created and enabled!"
fi

# Show swap status
sudo swapon --show
free -h
