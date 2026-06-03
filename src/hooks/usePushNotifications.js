// src/hooks/usePushNotifications.js
import { useState, useEffect } from "react";

const STORAGE_KEY = "cs_notif_permission";
const SCHEDULE_KEY = "cs_notif_scheduled_day";

export function usePushNotifications(streak = 0) {
  const [permission, setPermission] = useState(
    () => localStorage.getItem(STORAGE_KEY) || Notification?.permission || "default"
  );
  const [swReady, setSwReady] = useState(false);

  // Enregistrement du Service Worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      setSwReady(true);
      // Programme le rappel si permission déjà accordée
      if (Notification?.permission === "granted") scheduleReminder(reg, streak);
    }).catch(() => {});
  }, []);

  // Re-programme chaque jour si streak change
  useEffect(() => {
    if (!swReady || permission !== "granted") return;
    const today = new Date().toDateString();
    if (localStorage.getItem(SCHEDULE_KEY) === today) return; // déjà programmé aujourd'hui
    navigator.serviceWorker.ready.then((reg) => {
      scheduleReminder(reg, streak);
      localStorage.setItem(SCHEDULE_KEY, today);
    });
  }, [swReady, streak]);

  const scheduleReminder = (reg, currentStreak) => {
    const now = new Date();
    const target = new Date();
    target.setHours(20, 0, 0, 0); // 20h00
    if (now >= target) target.setDate(target.getDate() + 1); // demain 20h si déjà passé
    const delayMs = target - now;
    reg.active?.postMessage({ type: "SCHEDULE_STREAK_REMINDER", delayMs, streak: currentStreak });
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      localStorage.setItem(STORAGE_KEY, result);
      if (result === "granted") {
        const reg = await navigator.serviceWorker.ready;
        scheduleReminder(reg, streak);
        localStorage.setItem(SCHEDULE_KEY, new Date().toDateString());
      }
      return result;
    } catch {
      return "denied";
    }
  };

  const isSupported = "Notification" in window && "serviceWorker" in navigator;

  return { permission, requestPermission, isSupported };
}
