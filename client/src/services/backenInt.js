// backendInt.js
// Example service for backend API calls
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchMessages = () => axios.get(`${API_URL}/messages`);
export const fetchUsers = () => axios.get(`${API_URL}/users`);
export const fetchRooms = () => axios.get(`${API_URL}/rooms`);
