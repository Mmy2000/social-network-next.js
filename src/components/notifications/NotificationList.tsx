import React from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiService from "@/apiService/apiService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { useInfiniteQuery } from "@tanstack/react-query";
import InfiniteScroll from "react-infinite-scroll-component";
interface NotificationSender {
  id: number;
  first_name: string;
  last_name: string;
  profile: {
    profile_picture: string;
  };
}

interface Notification {
  id: number;
  notification_message: string;
  post?: {
    id: number;
  };
  comment?: {
    id: number;
    post: {
      id: number;
    };
  };
  event?: {
    id: number;
  };
  group?: {
    id: number;
  };
  is_read: boolean;
  created_at: string;
  sender: NotificationSender;
  notification_type:
    | "like"
    | "comment"
    | "reply"
    | "comment_like"
    | "friend_request"
    | "friend_request_accepted"
    | "friend_request_rejected"
    | "friend_request_cancelled"
    | "event_joined"
    | "event_not_joined"
    | "event_interested"
    | "event_not_interested"
    | "group_invitation"
    | "group_invitation_accepted"
    | "group_invitation_declined"
    | "group_member_removed";
}

interface NotificationResponse {
  notifications: Notification[];
  unread_count: number;
}

const NotificationList = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<NotificationResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiService.get("/notifications/", user?.access);
      return response.data;
    },
    enabled: !!user?.access,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  const markAsRead = async (notificationId: number) => {
    try {
      await apiService.post(
        `/notifications/${notificationId}/mark-read/`,
        null,
        user?.access
      );
      // Update the notification in the cache
      queryClient.setQueryData(
        ["notifications"],
        (oldData: NotificationResponse | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((notification) =>
              notification.id === notificationId
                ? { ...notification, is_read: true }
                : notification
            ),
            unread_count: Math.max(0, oldData.unread_count - 1),
          };
        }
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.post(
        "/notifications/mark-all-read/",
        null,
        user?.access
      );
      // Update all notifications in the cache
      queryClient.setQueryData(
        ["notifications"],
        (oldData: NotificationResponse | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((notification) => ({
              ...notification,
              is_read: true,
            })),
            unread_count: 0,
          };
        }
      );
      toast({
        title: "Success",
        description: "All notifications marked as read",
        variant: "success",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "error",
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    navigate(getNotificationLink(notification));
  };

  const getNotificationLink = (notification: Notification) => {
    switch (notification.notification_type) {
      case "like":
      case "comment":
      case "reply":
      case "comment_like":
        return `/post/${notification.post?.id}`;
      case "friend_request":
      case "friend_request_accepted":
      case "friend_request_rejected":
      case "friend_request_cancelled":
        return "/friends";
      case "group_invitation":
        return `/groups/${notification.group}`;
      case "group_invitation_accepted":
        return `/groups/${notification.group}`;
      case "group_invitation_declined":
        return `/groups/${notification.group}`;
      case "group_member_removed":
      case "event_joined":
        return `/events/${notification.event}`;
      case "event_not_joined":
        return `/events/${notification.event}`;
      case "event_interested":
        return `/events/${notification.event}`;
      case "event_not_interested":
        return `/events/${notification.event}`;
      default:
        return "#";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-gray-500 dark:text-gray-400">
        <BellOff className="h-12 w-12 mb-2" />
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <ScrollArea>
      {unreadCount > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-center gap-2 text-blue-600 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
            onClick={markAllAsRead}
          >
            <Check className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      )}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px]">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                !notification.is_read ? "bg-blue-50 dark:bg-gray-800" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <img
                    src={
                      notification.sender.profile.profile_picture ||
                      "https://via.placeholder.com/150"
                    }
                    alt={`${notification.sender.first_name} ${notification.sender.last_name}`}
                    className="h-full w-full object-cover rounded-full"
                  />
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium dark:text-gray-300">
                        {notification.sender.first_name}{" "}
                        {notification.sender.last_name}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2 dark:text-gray-400">
                        {notification.notification_message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          {
                            addSuffix: true,
                          }
                        )}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
};

export default NotificationList;
