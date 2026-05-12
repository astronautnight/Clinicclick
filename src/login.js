// login.js
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Signup
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
    const user = userCredential.user;

    // Create a profile in Firestore under "doctors" collection
    await setDoc(doc(db, "doctors", user.uid), {
      name: form.name,
      email: user.email,
      createdAt: new Date(),
      patients: [] // empty list for now
    });

    alert("Signup successful! Doctor profile created.");
  } catch (error) {
    alert(error.message);
  }
});

// Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful!");
  } catch (error) {
    alert(error.message);
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out.");
  } catch (error) {
    alert(error.message);
  }
});

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("logoutBtn").style.display = "block";
  } else {
    document.getElementById("logoutBtn").style.display = "none";
  }
});
