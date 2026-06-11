/**
 * Hand-written approximation of `supabase gen types typescript` output,
 * matching supabase/migrations/0001_init.sql. Once a live Supabase project
 * exists, regenerate this file with:
 *
 *   supabase gen types typescript --project-id <id> > types/database.types.ts
 *
 * Until then this file is the source of truth for `Database` used by
 * lib/supabase/client.ts and lib/supabase/server.ts.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
      };
      hotels: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          slug: string;
          timezone: string;
          locale: string;
          total_rooms: number;
          line_channel_access_token: string | null;
          line_channel_secret: string | null;
          line_target_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hotels"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["hotels"]["Row"]>;
      };
      hotel_branding: {
        Row: {
          hotel_id: string;
          product_name: string | null;
          tagline: string | null;
          logo_url: string | null;
          logo_dark_url: string | null;
          favicon_url: string | null;
          dashboard_welcome_image_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          accent_color: string | null;
          background_color: string | null;
          surface_color: string | null;
          sidebar_color: string | null;
          font_family_sans: string | null;
          font_family_mono: string | null;
          border_radius: string | null;
          icon_style: string | null;
          background_style: string | null;
          default_theme_mode: string | null;
          allow_user_mode_toggle: boolean;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hotel_branding"]["Row"]> & {
          hotel_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["hotel_branding"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_color: string | null;
          default_hotel_id: string | null;
          line_user_id: string | null;
          line_notifications_enabled: boolean;
          preferred_locale: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      user_hotel_roles: {
        Row: {
          id: string;
          user_id: string;
          hotel_id: string;
          role: Database["public"]["Enums"]["user_role"];
          department: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["user_hotel_roles"]["Row"]> & {
          user_id: string;
          hotel_id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: Partial<Database["public"]["Tables"]["user_hotel_roles"]["Row"]>;
      };
      vip_guests: {
        Row: {
          id: string;
          hotel_id: string;
          guest_name: string;
          vip_tier: Database["public"]["Enums"]["vip_tier"];
          vip_code: string | null;
          room: string | null;
          stay_start: string | null;
          stay_end: string | null;
          preferences: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vip_guests"]["Row"]> & {
          hotel_id: string;
          guest_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["vip_guests"]["Row"]>;
      };
      follow_ups: {
        Row: {
          id: string;
          hotel_id: string;
          description: string;
          department: Database["public"]["Enums"]["department"] | null;
          due_at: string | null;
          status: Database["public"]["Enums"]["followup_status"];
          assignee_id: string | null;
          created_by: string | null;
          source_table: string | null;
          source_id: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["follow_ups"]["Row"]> & {
          hotel_id: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["follow_ups"]["Row"]>;
      };
      escalations: {
        Row: {
          id: string;
          hotel_id: string;
          source_table: string;
          source_id: string;
          escalated_by: string | null;
          escalated_to_role: Database["public"]["Enums"]["user_role"] | null;
          escalated_to_user: string | null;
          reason: string | null;
          status: Database["public"]["Enums"]["escalation_status"];
          escalated_at: string;
          acknowledged_at: string | null;
          resolved_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["escalations"]["Row"]> & {
          hotel_id: string;
          source_table: string;
          source_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["escalations"]["Row"]>;
      };
      guest_cases: {
        Row: {
          id: string;
          case_number: string;
          hotel_id: string;
          room: string | null;
          guest_name: string;
          case_type: string;
          department: Database["public"]["Enums"]["department"];
          priority: Database["public"]["Enums"]["priority_level"];
          status: Database["public"]["Enums"]["case_status"];
          assignee_id: string | null;
          resolution: string | null;
          recovery_action: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["guest_cases"]["Row"]> & {
          case_number: string;
          hotel_id: string;
          guest_name: string;
          case_type: string;
          department: Database["public"]["Enums"]["department"];
        };
        Update: Partial<Database["public"]["Tables"]["guest_cases"]["Row"]>;
      };
      guest_case_events: {
        Row: {
          id: string;
          case_id: string;
          occurred_at: string;
          message: string;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["guest_case_events"]["Row"]> & {
          case_id: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["guest_case_events"]["Row"]>;
      };
      tasks: {
        Row: {
          id: string;
          task_number: string;
          hotel_id: string;
          title: string;
          room: string | null;
          department: Database["public"]["Enums"]["department"];
          priority: Database["public"]["Enums"]["priority_level"];
          column_status: Database["public"]["Enums"]["task_column"];
          assignee_id: string | null;
          due_at: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          task_number: string;
          hotel_id: string;
          title: string;
          department: Database["public"]["Enums"]["department"];
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
      };
      task_tags: {
        Row: {
          task_id: string;
          tag: string;
        };
        Insert: Database["public"]["Tables"]["task_tags"]["Row"];
        Update: Partial<Database["public"]["Tables"]["task_tags"]["Row"]>;
      };
      shift_handovers: {
        Row: {
          id: string;
          handover_number: string;
          hotel_id: string;
          shift: Database["public"]["Enums"]["shift_type"];
          shift_date: string;
          from_user_id: string | null;
          to_user_id: string | null;
          handover_time: string;
          notes: string | null;
          status: Database["public"]["Enums"]["handover_status"];
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shift_handovers"]["Row"]> & {
          handover_number: string;
          hotel_id: string;
          shift: Database["public"]["Enums"]["shift_type"];
          shift_date: string;
          handover_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["shift_handovers"]["Row"]>;
      };
      handover_open_cases: {
        Row: {
          id: string;
          handover_id: string;
          reference_label: string;
          guest_case_id: string | null;
          incident_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["handover_open_cases"]["Row"]> & {
          handover_id: string;
          reference_label: string;
        };
        Update: Partial<Database["public"]["Tables"]["handover_open_cases"]["Row"]>;
      };
      handover_followups: {
        Row: {
          id: string;
          handover_id: string;
          task: string;
          due_at: string | null;
          department: Database["public"]["Enums"]["department"] | null;
          completed: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["handover_followups"]["Row"]> & {
          handover_id: string;
          task: string;
        };
        Update: Partial<Database["public"]["Tables"]["handover_followups"]["Row"]>;
      };
      handover_department_updates: {
        Row: {
          id: string;
          handover_id: string;
          department: Database["public"]["Enums"]["department"];
          update_text: string;
        };
        Insert: Partial<Database["public"]["Tables"]["handover_department_updates"]["Row"]> & {
          handover_id: string;
          department: Database["public"]["Enums"]["department"];
          update_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["handover_department_updates"]["Row"]>;
      };
      arrivals: {
        Row: {
          id: string;
          arrival_number: string;
          hotel_id: string;
          guest_name: string;
          nationality: string | null;
          room: string | null;
          eta: string | null;
          flight_number: string | null;
          transfer_type: string | null;
          vip_tier: Database["public"]["Enums"]["vip_tier"];
          vip_guest_id: string | null;
          room_ready: boolean;
          special_requests: string | null;
          status: Database["public"]["Enums"]["arrival_status"];
          arrival_date: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["arrivals"]["Row"]> & {
          arrival_number: string;
          hotel_id: string;
          guest_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["arrivals"]["Row"]>;
      };
      incidents: {
        Row: {
          id: string;
          incident_number: string;
          hotel_id: string;
          category: Database["public"]["Enums"]["incident_category"];
          title: string;
          room: string | null;
          department: Database["public"]["Enums"]["department"] | null;
          priority: Database["public"]["Enums"]["priority_level"];
          status: Database["public"]["Enums"]["incident_status"];
          assigned_to: string | null;
          reported_at: string;
          recovery_action: string | null;
          resolution: string | null;
          guest_name: string | null;
          source: string | null;
          case_subtype: string | null;
          details: string | null;
          cost: number | null;
          currency: string | null;
          logged_by: string | null;
          guest_notes: string | null;
          department_raw: string | null;
          period_of_stay: string | null;
          nationality: string | null;
          location: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["incidents"]["Row"]> & {
          incident_number: string;
          hotel_id: string;
          category: Database["public"]["Enums"]["incident_category"];
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["incidents"]["Row"]>;
      };
      incident_events: {
        Row: {
          id: string;
          incident_id: string;
          occurred_at: string;
          message: string;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["incident_events"]["Row"]> & {
          incident_id: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["incident_events"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          hotel_id: string;
          recipient_id: string | null;
          recipient_role: Database["public"]["Enums"]["user_role"] | null;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          body: string | null;
          department: Database["public"]["Enums"]["department"] | null;
          priority: Database["public"]["Enums"]["priority_level"] | null;
          source_table: string | null;
          source_id: string | null;
          read: boolean;
          line_delivery_status: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          hotel_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_hotel_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      current_user_is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role:
        | "super_admin"
        | "general_manager"
        | "duty_manager"
        | "front_office"
        | "housekeeping"
        | "engineering"
        | "fnb"
        | "security"
        | "concierge"
        | "staff";
      priority_level: "low" | "medium" | "high" | "critical";
      department:
        | "Front Office"
        | "Housekeeping"
        | "Engineering"
        | "F&B"
        | "Security"
        | "Concierge"
        | "Finance";
      vip_tier: "Standard" | "VIP" | "VVIP";
      followup_status: "Pending" | "Completed" | "Overdue";
      escalation_status: "Open" | "Acknowledged" | "Resolved";
      case_status: "Pending" | "In Progress" | "Escalated" | "Resolved" | "Closed";
      task_column: "New" | "Assigned" | "In Progress" | "Waiting" | "Completed";
      shift_type: "Morning" | "Afternoon" | "Evening" | "Night";
      handover_status: "Active" | "Closed";
      arrival_status: "Confirmed" | "En Route" | "Flight Delayed" | "Arrived";
      incident_category: "Security" | "Guest Complaint" | "Maintenance" | "F&B";
      incident_status:
        | "Pending"
        | "In Progress"
        | "Escalated"
        | "Resolved"
        | "Closed";
      notification_type:
        | "escalation"
        | "task"
        | "complaint"
        | "followup"
        | "alert"
        | "vip";
    };
  };
}
