// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAAvH_IObvkCeYnghWv0TPevjvkEwnQBUs",
  authDomain: "moneymate-2a58b.firebaseapp.com",
  projectId: "moneymate-2a58b",
  storageBucket: "moneymate-2a58b.firebasestorage.app",
  messagingSenderId: "327190947886",
  appId: "1:327190947886:web:b7a4fa75f1dc4c749617bf",
  measurementId: "G-8DTL48T4JF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);