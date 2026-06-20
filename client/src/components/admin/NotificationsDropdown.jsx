import { useState, useEffect } from "react";
import { Bell, Clock, Video, Calendar, CheckCircle, X, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Handle click on pending booking card
  const handlePendingBookingClick = (bookingId) => {
    setIsOpen(false);
    navigate('/Admin/Booking', { state: { focusBookingId: bookingId } });
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch pending bookings (comprehensive query to catch all new bookings)
      const { data: pendingData, error: pendingError } = await supabase
        .from('demo_bookings')
        .select('*')
        .or('status.in.(pending,new),status.is.null,status.eq.undefined')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch approved bookings (upcoming meetings)
      const { data: approvedData, error: approvedError } = await supabase
        .from('demo_bookings')
        .select('*')
        .eq('status', 'approved')
        .gte('preferred_date', new Date().toISOString().split('T')[0])
        .order('preferred_date', { ascending: true })
        .order('preferred_time', { ascending: true })
        .limit(5);

      if (approvedError) throw approvedError;

      setPendingBookings(pendingData || []);
      setUpcomingMeetings(approvedData || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for all booking changes
    const subscription = supabase
      .channel('booking-notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'demo_bookings' 
        }, 
        (payload) => {
          console.log('🔔 Booking change detected:', payload);
          
          // Log specific events for debugging
          if (payload.eventType === 'INSERT') {
            console.log('📝 New booking added:', payload.new);
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ Booking updated:', payload.new);
          }
          
          // Refresh notifications
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time notifications subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const formatCreatedTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMeetingLink = (booking) => {
    if (booking.platform === 'zoom') return booking.zoom_join_url;
    if (booking.platform === 'google_meet') return booking.meet_link;
    return null;
  };

  const getPlatformIcon = (platform) => {
    return <Video className="w-4 h-4" />;
  };

  const getPlatformLabel = (platform) => {
    if (platform === 'google_meet') return 'Google Meet';
    return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Unknown';
  };

  const totalNotifications = pendingBookings.length + upcomingMeetings.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-1.5 rounded-md transition-colors ${isDark
          ? "hover:bg-white/10 text-gray-400"
          : "hover:bg-gray-100 text-gray-500"
        }`}
      >
        <Bell className="w-4 h-4" />
        {totalNotifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 bg-[#c9a84c] text-[#0a0e1a] text-xs font-bold rounded-full flex items-center justify-center px-1">
            {totalNotifications > 99 ? '99+' : totalNotifications}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 top-full mt-2 w-96 rounded-xl shadow-lg border overflow-hidden z-20 max-h-96 overflow-y-auto ${isDark
            ? "bg-[#0d1525] border-white/10"
            : "bg-white border-gray-200"
          }`}>
            {/* Header */}
            <div className={`p-4 border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded-md transition-colors ${isDark
                    ? "hover:bg-white/10 text-gray-400"
                    : "hover:bg-gray-100 text-gray-500"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#c9a84c]"></div>
                </div>
              ) : totalNotifications === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    All caught up! No new notifications.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pending Bookings */}
                  {pendingBookings.length > 0 && (
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pending Approval ({pendingBookings.length})
                      </h4>
                      <div className="space-y-2">
                        {pendingBookings.map((booking) => (
                          <div
                            key={booking.id}
                            onClick={() => handlePendingBookingClick(booking.id)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${isDark
                              ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/30"
                              : "bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg ${isDark ? "bg-amber-500/20" : "bg-amber-100"}`}>
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {booking.full_name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                                      Pending
                                    </span>
                                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                      {formatDate(booking.preferred_date)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs mb-2">
                                  <span className={`flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    <Clock className="w-3 h-3" />
                                    {booking.preferred_time}
                                  </span>
                                  <span className={`flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    {getPlatformIcon(booking.platform)}
                                    {getPlatformLabel(booking.platform)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  {booking.company && (
                                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                      {booking.company}
                                    </p>
                                  )}
                                  <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    Added {formatCreatedTime(booking.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Meetings */}
                  {upcomingMeetings.length > 0 && (
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                        <Video className="w-3.5 h-3.5" />
                        Upcoming Meetings ({upcomingMeetings.length})
                      </h4>
                      <div className="space-y-2">
                        {upcomingMeetings.map((booking) => {
                          const meetingLink = getMeetingLink(booking);
                          return (
                            <div
                              key={booking.id}
                              className={`p-3 rounded-lg border transition-colors hover:opacity-80 ${isDark
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : "bg-emerald-50 border-emerald-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-1.5 rounded-lg ${isDark ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
                                  <Video className="w-3.5 h-3.5 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                      {booking.full_name}
                                    </p>
                                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                      {formatDate(booking.preferred_date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className={`flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                      <Clock className="w-3 h-3" />
                                      {booking.preferred_time}
                                    </span>
                                    <span className={`flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                      {getPlatformIcon(booking.platform)}
                                      {getPlatformLabel(booking.platform)}
                                    </span>
                                  </div>
                                  {meetingLink && (
                                    <button
                                      onClick={() => window.open(meetingLink, '_blank')}
                                      className={`mt-2 inline-flex items-center gap-1 text-xs font-medium transition-colors ${isDark
                                        ? "text-emerald-400 hover:text-emerald-300"
                                        : "text-emerald-600 hover:text-emerald-700"
                                      }`}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Join Meeting
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {totalNotifications > 0 && (
              <div className={`p-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/Admin/Booking';
                  }}
                  className={`w-full text-center text-sm font-medium transition-colors ${isDark
                    ? "text-[#c9a84c] hover:text-[#c9a84c]/80"
                    : "text-[#c9a84c] hover:text-[#c9a84c]/80"
                  }`}
                >
                  View All in Booking Dashboard
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
