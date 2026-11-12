import { useState, useEffect, useCallback } from 'react';
import { getTodayFollowUps } from '../api/followups';
import { getUpcomingEvents } from '../api/events';
import { getLeads } from '../api/leads';
import { getWhatsAppLogs } from '../api/whatsapp';
import { parseCleanBalance } from '../utils/balance';

const READ_STORAGE_KEY = 'crm_read_notification_ids';
const DISMISSED_STORAGE_KEY = 'crm_dismissed_notification_ids';
const POLL_INTERVAL_MS = 45000; // refresh every 45s
const WINDOW_MS = 24 * 60 * 60 * 1000; // "recent" = last 24h

const loadReadIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const saveReadIds = (ids) => {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
};

const loadDismissedIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const saveDismissedIds = (ids) => {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
};

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(loadReadIds);
  const [dismissedIds, setDismissedIds] = useState(loadDismissedIds);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [followUpData, eventData, leadData, waData] = await Promise.allSettled([
        getTodayFollowUps(),
        getUpcomingEvents(5),
        getLeads({ limit: 40 }),
        getWhatsAppLogs({ status: 'failed', limit: 15 }),
      ]);

      const now = Date.now();
      const items = [];

      // 1. Pending follow-ups due today
      if (followUpData.status === 'fulfilled' && followUpData.value?.followUps) {
        followUpData.value.followUps
          .filter((fu) => fu.status === 'pending')
          .forEach((fu) => {
            items.push({
              id: `followup-${fu._id || fu.id}`,
              type: 'followup',
              category: 'Follow-ups & Tasks',
              title: 'Follow-up Due Today',
              message: `Scheduled follow-up with ${fu.customerName || 'customer'} at ${fu.time || 'scheduled time'}.`,
              contactName: fu.customerName,
              phone: fu.phone,
              time: fu.createdAt || new Date().toISOString(),
              priority: 'high',
              route: 'todos',
            });
          });
      }

      // 2. Events coming up in the next 5 days
      if (eventData.status === 'fulfilled' && eventData.value?.events) {
        eventData.value.events.forEach((ev) => {
          items.push({
            id: `event-${ev._id || ev.id}`,
            type: 'event',
            category: 'Calendar & Events',
            title: `${ev.type ? ev.type.charAt(0).toUpperCase() + ev.type.slice(1) : 'Meeting'} Reminder`,
            message: `${ev.customerName || 'Customer'}'s ${ev.type || 'meeting'} is scheduled for ${new Date(ev.date).toLocaleDateString()}.`,
            contactName: ev.customerName,
            time: ev.createdAt || new Date().toISOString(),
            priority: 'medium',
            route: 'events',
          });
        });
      }

      // 3. Leads created or converted in the last 24h
      if (leadData.status === 'fulfilled' && leadData.value?.leads) {
        leadData.value.leads.forEach((lead) => {
          const created = new Date(lead.createdAt).getTime();
          if (now - created < WINDOW_MS) {
            items.push({
              id: `lead-new-${lead._id || lead.id}`,
              type: 'lead',
              category: 'Leads & Pipeline',
              title: 'New Lead Inbound',
              message: `${lead.customerName || 'New prospect'} was added as a lead from ${lead.source || 'Website'}.`,
              contactName: lead.customerName,
              phone: lead.phone,
              time: lead.createdAt,
              priority: 'medium',
              route: 'leads',
            });
          }
          if (lead.status === 'converted') {
            const updated = new Date(lead.updatedAt).getTime();
            if (now - updated < WINDOW_MS) {
              items.push({
                id: `lead-converted-${lead._id || lead.id}`,
                type: 'conversion',
                category: 'Leads & Pipeline',
                title: 'Lead Converted!',
                message: `Congratulations! ${lead.customerName || 'Lead'} converted into an active customer.`,
                contactName: lead.customerName,
                time: lead.updatedAt,
                priority: 'high',
                route: 'leads',
              });
            }
          }
        });
      }

      // 4. Failed WhatsApp sends in the last 24h
      if (waData.status === 'fulfilled' && waData.value?.logs) {
        waData.value.logs.forEach((log) => {
          if (now - new Date(log.createdAt).getTime() < WINDOW_MS) {
            items.push({
              id: `whatsapp-failed-${log._id || log.id}`,
              type: 'whatsapp',
              category: 'Communications',
              title: 'WhatsApp Delivery Failed',
              message: `Message to ${log.customerName || log.recipient || 'recipient'} failed to deliver. Check template and balance.`,
              contactName: log.customerName,
              time: log.createdAt,
              priority: 'urgent',
              route: 'whatsapp',
            });
          }
        });
      }

      // 5. Low Wallet Balance Alert
      try {
        const savedBal = localStorage.getItem('crm_wallet_balance');
        const numBal = savedBal !== null ? parseCleanBalance(savedBal) : null;
        if (numBal !== null && numBal < 50) {
          items.push({
            id: 'wallet-low-balance-alert',
            type: 'wallet',
            category: 'Billing & Wallet',
            title: 'Low Wallet Balance',
            message: `Current balance is ₹${numBal.toFixed(1)}. Top up your wallet to ensure uninterrupted cloud calls and WhatsApp messaging.`,
            time: new Date().toISOString(),
            priority: 'urgent',
            route: 'wallet',
          });
        }
      } catch {}

      // 6. Filter out dismissed notifications
      const dismissed = loadDismissedIds();
      const activeItems = items.filter((n) => !dismissed.has(n.id));

      activeItems.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(activeItems);
    } catch {
      // Leave existing notifications in place if a refresh fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 600);
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refresh]);

  const markRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      saveReadIds(next);
      return next;
    });
  };

  const markUnread = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      saveReadIds(next);
      return next;
    });
  };

  const dismissNotification = (id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev).add(id);
      saveDismissedIds(next);
      return next;
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      saveDismissedIds(next);
      return next;
    });
    setNotifications([]);
  };

  const withReadState = notifications.map((n) => ({ ...n, read: readIds.has(n.id) }));
  const unreadCount = withReadState.filter((n) => !n.read).length;

  return {
    notifications: withReadState,
    unreadCount,
    loading,
    markRead,
    markUnread,
    markAllRead,
    dismissNotification,
    clearAll,
    refresh,
  };
}
