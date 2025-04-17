#!/bin/bash
curl --request GET --url http://localhost:3000/block; 
sleep 1; 
echo "\n"; 
curl --request GET --url http://localhost:3000/block/100;
sleep 1; 
echo "\n";
curl --request GET --url http://localhost:3000/tx;
sleep 1;
echo "\n";
curl --request GET --url http://localhost:3000/tx;
sleep 1;
echo "\n";
curl --request GET --url http://localhost:3000/stats;sleep 1; echo "\n";curl --request POST --url "http://localhost:3000/index?auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzQ0NjM2MTIxLCJleHAiOjE3NDQ3MjI1MjF9.x7FIIW8Wb6JPxJ03li5P5_DAkhQ-Lvnuhr7EJYPOKb0&scan=22265800:22265850"
