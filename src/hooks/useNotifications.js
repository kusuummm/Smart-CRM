import { useState, useEffect, useCallback } from 'react';
import { getTodayFollowUps } from '../api/followups';
import { getUpcomingEvents } from '../api/events';
import { getLeads } from '../api/leads';
import { getWhatsAppLogs } from '../api/whatsapp';

const READ_STORAGE_KEY = 'crm_read_notification_ids';
const POLL_INTERVAL_MS = 60000; // refresh every 60s so the bell stays current
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
  } catch {
    // ignore storage failures (e.g. private browsing)
  }
};

// Builds a live notification feed out of real backend data - no separate
// "notifications" collection needed. Each source is time-windowed to the
// last 24h so the bell reflects genuinely recent activity, not everything
// that has ever happened.
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(loadReadIds);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [followUpData, eventData, leadData, waData] = await Promise.all([
        getTodayFollowUps(),
        getUpcomingEvents(3),
        getLeads({ limit: 200 }),
        getWhatsAppLogs({ status: 'failed', limit: 10 }),
      ]);

      const now = Date.now();
      const items = [];

      // Pending follow-ups due today
      followUpData.followUps
        .filter((fu) => fu.status === 'pending')
        .forEach((fu) => {
          items.push({
            id: `followup-${fu._id}`,
            type: 'followup',
            title: 'Follow-up Reminder',
            message: `Follow-up with ${fu.customerName} scheduled today at ${fu.time}.`,
            time: fu.createdAt,
            route: 'followups',
          });
        });

      // Events coming up in the next 3 days
      eventData.events.forEach((ev) => {
        items.push({
          id: `event-${ev._id}`,
          type: 'event',
          title: `${ev.type.charAt(0).toUpperCase() + ev.type.slice(1)} Reminder`,
          message: `${ev.customerName}'s ${ev.type} is on ${new Date(ev.date).toLocaleDateString()}.`,
          time: ev.createdAt,
          route: 'events',
        });
      });

      // Leads created or converted in the last 24h
      leadData.leads.forEach((lead) => {
        const created = new Date(lead.createdAt).getTime();
        if (now - created < WINDOW_MS && lead.history.length <= 1) {
          items.push({
            id: `lead-new-${lead._id}`,
            type: 'lead',
            title: 'New Lead Assigned',
            message: `${lead.customerName} has been added as a new lead.`,
            time: lead.createdAt,
            route: 'leads',
          });
        }
        if (lead.status === 'converted') {
          const updated = new Date(lead.updatedAt).getTime();
          if (now - updated < WINDOW_MS) {
            items.push({
              id: `lead-converted-${lead._id}`,
              type: 'conversion',
              title: 'Lead Converted',
              message: `${lead.customerName} has been converted to a customer!`,
              time: lead.updatedAt,
              route: 'leads',
            });
          }
        }
      });

      // Failed WhatsApp sends in the last 24h
      waData.logs.forEach((log) => {
        if (now - new Date(log.createdAt).getTime() < WINDOW_MS) {
          items.push({
            id: `whatsapp-failed-${log._id}`,
            type: 'whatsapp',
            title: 'WhatsApp Delivery Failed',
            message: `Message to ${log.customerName} could not be delivered.`,
            time: log.createdAt,
            route: 'whatsapp',
          });
        }
      });

      items.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(items.slice(0, 15));
    } catch {
      // Leave existing notifications in place if a refresh fails (e.g. a
      // transient network blip) rather than clearing the bell to empty.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
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

  const withReadState = notifications.map((n) => ({ ...n, read: readIds.has(n.id) }));
  const unreadCount = withReadState.filter((n) => !n.read).length;

  return { notifications: withReadState, unreadCount, loading, markRead, markAllRead, refresh };
}
