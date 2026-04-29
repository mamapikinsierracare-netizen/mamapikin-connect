'use client';

import { useEffect, useState } from 'react';          // useEffect and useState from React
import { getInbox, sendFacilityMessage } from '@/lib/messagingService';
import { FacilityMessage } from '@/lib/communicationDB';
import { useFacility } from '@/hooks/useFacility';   // custom hook (note capital F)

export default function MessageInbox() {
  const { facilityId } = useFacility();
  const [messages, setMessages] = useState<FacilityMessage[]>([]);
  const [newMessage, setNewMessage] = useState({
    to: '',
    subject: '',
    content: '',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (facilityId) {
      getInbox(facilityId).then(setMessages).catch(console.error);
    }
  }, [facilityId]);

  const handleSend = async () => {
    if (!newMessage.to || !newMessage.subject || !newMessage.content) {
      alert('Please fill in all fields');
      return;
    }
    setSending(true);
    try {
      await sendFacilityMessage(
        facilityId,
        newMessage.to,
        newMessage.subject,
        newMessage.content,
        false, // isUrgent
        true   // isOperational
      );
      setNewMessage({ to: '', subject: '', content: '' });
      const updated = await getInbox(facilityId);
      setMessages(updated);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-green-800">Facility Messages</h1>

      {/* Compose new message */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">New Message</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="To (Facility ID or Name)"
            value={newMessage.to}
            onChange={(e) => setNewMessage({ ...newMessage, to: e.target.value })}
            className="w-full border border-gray-300 p-2 rounded"
          />
          <input
            type="text"
            placeholder="Subject"
            value={newMessage.subject}
            onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
            className="w-full border border-gray-300 p-2 rounded"
          />
          <textarea
            placeholder="Message content..."
            rows={3}
            value={newMessage.content}
            onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
            className="w-full border border-gray-300 p-2 rounded"
          />
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>

      {/* Inbox */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-3">Inbox</h2>
        {messages.length === 0 ? (
          <p className="text-gray-500">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="border border-gray-200 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-blue-700">{msg.subject}</div>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  From: <span className="font-medium">{msg.fromFacilityId}</span>
                </div>
                <div className="mt-2 text-gray-700">{msg.content}</div>
                {msg.isUrgent && (
                  <div className="mt-2 text-red-600 text-sm font-semibold">🚨 URGENT</div>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  Status: {msg.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}