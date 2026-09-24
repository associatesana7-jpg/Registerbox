export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          business_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          confidence: number | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json
        }
        Insert: {
          confidence?: number | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json
        }
        Update: {
          confidence?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          input_hash: string | null
          intent_id: string | null
          latency_ms: number | null
          model: string
          operation: string
          output_json: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          input_hash?: string | null
          intent_id?: string | null
          latency_ms?: number | null
          model: string
          operation: string
          output_json?: Json | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          input_hash?: string | null
          intent_id?: string | null
          latency_ms?: number | null
          model?: string
          operation?: string
          output_json?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "business_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          application_id: string
          attachments: Json
          created_at: string
          description: string
          event_type: string
          id: string
          notes: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          application_id: string
          attachments?: Json
          created_at?: string
          description: string
          event_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          application_id?: string
          attachments?: Json
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_number: string | null
          approved_at: string | null
          assigned_staff_id: string | null
          business_id: string
          certificate_document_id: string | null
          created_at: string
          deleted_at: string | null
          government_reference: string | null
          id: string
          notes: string | null
          order_id: string | null
          portal_name: string | null
          priority: string
          progress_percentage: number
          rejected_at: string | null
          service_id: string
          status: string
          submission_mode: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          application_number?: string | null
          approved_at?: string | null
          assigned_staff_id?: string | null
          business_id: string
          certificate_document_id?: string | null
          created_at?: string
          deleted_at?: string | null
          government_reference?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          portal_name?: string | null
          priority?: string
          progress_percentage?: number
          rejected_at?: string | null
          service_id: string
          status?: string
          submission_mode?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          application_number?: string | null
          approved_at?: string | null
          assigned_staff_id?: string | null
          business_id?: string
          certificate_document_id?: string | null
          created_at?: string
          deleted_at?: string | null
          government_reference?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          portal_name?: string | null
          priority?: string
          progress_percentage?: number
          rejected_at?: string | null
          service_id?: string
          status?: string
          submission_mode?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_certificate_document_id_fkey"
            columns: ["certificate_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          device: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip: unknown
          new_value: Json | null
          old_value: Json | null
          source: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          device?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: unknown
          new_value?: Json | null
          old_value?: Json | null
          source?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          device?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: unknown
          new_value?: Json | null
          old_value?: Json | null
          source?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address_id: string | null
          business_id: string
          created_at: string
          employee_count: number | null
          id: string
          industry: string | null
          name: string
          status: string
          turnover: number | null
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          business_id: string
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          name: string
          status?: string
          turnover?: number | null
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          business_id?: string
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          name?: string
          status?: string
          turnover?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "business_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          business_id: string
          city: string
          country: string
          created_at: string
          district: string | null
          electricity_bill_document_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          ownership_type: string | null
          pincode: string
          rent_agreement_document_id: string | null
          state: string
          type: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          business_id: string
          city: string
          country?: string
          created_at?: string
          district?: string | null
          electricity_bill_document_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          ownership_type?: string | null
          pincode: string
          rent_agreement_document_id?: string | null
          state: string
          type: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          business_id?: string
          city?: string
          country?: string
          created_at?: string
          district?: string | null
          electricity_bill_document_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          ownership_type?: string | null
          pincode?: string
          rent_agreement_document_id?: string | null
          state?: string
          type?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_addresses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_field_evidence: {
        Row: {
          business_id: string
          confidence: number | null
          created_at: string
          field_name: string
          field_value: Json | null
          id: string
          last_verified_at: string | null
          source: string
          verification_status: string
        }
        Insert: {
          business_id: string
          confidence?: number | null
          created_at?: string
          field_name: string
          field_value?: Json | null
          id?: string
          last_verified_at?: string | null
          source: string
          verification_status?: string
        }
        Update: {
          business_id?: string
          confidence?: number | null
          created_at?: string
          field_name?: string
          field_value?: Json | null
          id?: string
          last_verified_at?: string | null
          source?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_field_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_intents: {
        Row: {
          activities: Json
          ai_confidence: number | null
          classification_source: string
          created_at: string
          entity_preference: string | null
          existing_business_id: string | null
          existing_establishment_id: string | null
          id: string
          industry: string | null
          intent_type: string
          location_city: string | null
          location_state: string | null
          missing_critical_facts: Json
          raw_user_input: string
          status: string
          subindustry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activities?: Json
          ai_confidence?: number | null
          classification_source?: string
          created_at?: string
          entity_preference?: string | null
          existing_business_id?: string | null
          existing_establishment_id?: string | null
          id?: string
          industry?: string | null
          intent_type: string
          location_city?: string | null
          location_state?: string | null
          missing_critical_facts?: Json
          raw_user_input: string
          status?: string
          subindustry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activities?: Json
          ai_confidence?: number | null
          classification_source?: string
          created_at?: string
          entity_preference?: string | null
          existing_business_id?: string | null
          existing_establishment_id?: string | null
          id?: string
          industry?: string | null
          intent_type?: string
          location_city?: string | null
          location_state?: string | null
          missing_critical_facts?: Json
          raw_user_input?: string
          status?: string
          subindustry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_intents_existing_business_id_fkey"
            columns: ["existing_business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_intents_existing_establishment_id_fkey"
            columns: ["existing_establishment_id"]
            isOneToOne: false
            referencedRelation: "business_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          ownership_percentage: number | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          ownership_percentage?: number | null
          role: string
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          ownership_percentage?: number | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_people: {
        Row: {
          address: Json
          business_id: string
          created_at: string
          designation: string | null
          din: string | null
          email: string | null
          id: string
          identity_documents: Json
          mobile: string | null
          name: string
          ownership_percentage: number | null
          pan: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: Json
          business_id: string
          created_at?: string
          designation?: string | null
          din?: string | null
          email?: string | null
          id?: string
          identity_documents?: Json
          mobile?: string | null
          name: string
          ownership_percentage?: number | null
          pan?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: Json
          business_id?: string
          created_at?: string
          designation?: string | null
          din?: string | null
          email?: string | null
          id?: string
          identity_documents?: Json
          mobile?: string | null
          name?: string
          ownership_percentage?: number | null
          pan?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_people_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          annual_turnover: number | null
          business_category: string | null
          business_start_date: string | null
          business_subcategory: string | null
          cin: string | null
          constitution: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          employee_count: number | null
          entity_type: string | null
          gstin: string | null
          id: string
          legal_name: string | null
          pan: string | null
          phone: string | null
          questionnaire: Json
          status: string
          trade_name: string | null
          udyam_number: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          annual_turnover?: number | null
          business_category?: string | null
          business_start_date?: string | null
          business_subcategory?: string | null
          cin?: string | null
          constitution?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          entity_type?: string | null
          gstin?: string | null
          id?: string
          legal_name?: string | null
          pan?: string | null
          phone?: string | null
          questionnaire?: Json
          status?: string
          trade_name?: string | null
          udyam_number?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          annual_turnover?: number | null
          business_category?: string | null
          business_start_date?: string | null
          business_subcategory?: string | null
          cin?: string | null
          constitution?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          entity_type?: string | null
          gstin?: string | null
          id?: string
          legal_name?: string | null
          pan?: string | null
          phone?: string | null
          questionnaire?: Json
          status?: string
          trade_name?: string | null
          udyam_number?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      business_registrations: {
        Row: {
          business_id: string
          certificate_document_id: string | null
          created_at: string
          establishment_id: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          registration_catalog_id: string
          registration_number: string | null
          source: string
          status: string
          updated_at: string
          verification_source: string | null
          verified_at: string | null
        }
        Insert: {
          business_id: string
          certificate_document_id?: string | null
          created_at?: string
          establishment_id?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          registration_catalog_id: string
          registration_number?: string | null
          source?: string
          status?: string
          updated_at?: string
          verification_source?: string | null
          verified_at?: string | null
        }
        Update: {
          business_id?: string
          certificate_document_id?: string | null
          created_at?: string
          establishment_id?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          registration_catalog_id?: string
          registration_number?: string | null
          source?: string
          status?: string
          updated_at?: string
          verification_source?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_registrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_registrations_certificate_document_id_fkey"
            columns: ["certificate_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_registrations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "business_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_registrations_registration_catalog_id_fkey"
            columns: ["registration_catalog_id"]
            isOneToOne: false
            referencedRelation: "registration_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_results: {
        Row: {
          business_id: string
          confidence: number | null
          id: string
          missing_information: Json
          reason: string
          rule_id: string | null
          scanned_at: string
          service_id: string
          source_snapshot: Json
          status: string
        }
        Insert: {
          business_id: string
          confidence?: number | null
          id?: string
          missing_information?: Json
          reason: string
          rule_id?: string | null
          scanned_at?: string
          service_id: string
          source_snapshot?: Json
          status: string
        }
        Update: {
          business_id?: string
          confidence?: number | null
          id?: string
          missing_information?: Json
          reason?: string
          rule_id?: string | null
          scanned_at?: string
          service_id?: string
          source_snapshot?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_results_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_results_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rule_versions: {
        Row: {
          approved_by: string | null
          conditions: Json
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          result: Json
          rule_id: string
          version: number
        }
        Insert: {
          approved_by?: string | null
          conditions: Json
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          result: Json
          rule_id: string
          version: number
        }
        Update: {
          approved_by?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          result?: Json
          rule_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rule_versions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          active: boolean
          business_activity: string | null
          city: string | null
          conditions_json: Json
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_max: number | null
          employee_min: number | null
          entity_type: string | null
          id: string
          industry: string | null
          jurisdiction_country: string
          last_verified_at: string | null
          name: string
          priority: number
          reason_template: string
          result_status: string
          service_id: string
          source_document: string | null
          source_url: string | null
          state: string | null
          subindustry: string | null
          turnover_max: number | null
          turnover_min: number | null
          verified_by: string | null
          version: number
        }
        Insert: {
          active?: boolean
          business_activity?: string | null
          city?: string | null
          conditions_json?: Json
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_max?: number | null
          employee_min?: number | null
          entity_type?: string | null
          id?: string
          industry?: string | null
          jurisdiction_country?: string
          last_verified_at?: string | null
          name: string
          priority?: number
          reason_template: string
          result_status: string
          service_id: string
          source_document?: string | null
          source_url?: string | null
          state?: string | null
          subindustry?: string | null
          turnover_max?: number | null
          turnover_min?: number | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          active?: boolean
          business_activity?: string | null
          city?: string | null
          conditions_json?: Json
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_max?: number | null
          employee_min?: number | null
          entity_type?: string | null
          id?: string
          industry?: string | null
          jurisdiction_country?: string
          last_verified_at?: string | null
          name?: string
          priority?: number
          reason_template?: string
          result_status?: string
          service_id?: string
          source_document?: string | null
          source_url?: string | null
          state?: string | null
          subindustry?: string | null
          turnover_max?: number | null
          turnover_min?: number | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          accepted_at: string
          business_id: string | null
          consent_type: string
          device: string | null
          id: string
          ip: unknown
          purpose: string
          revoked_at: string | null
          scope: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          business_id?: string | null
          consent_type: string
          device?: string | null
          id?: string
          ip?: unknown
          purpose: string
          revoked_at?: string | null
          scope: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          business_id?: string | null
          consent_type?: string
          device?: string | null
          id?: string
          ip?: unknown
          purpose?: string
          revoked_at?: string | null
          scope?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_actions: {
        Row: {
          application_id: string | null
          business_id: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          metadata: Json
          priority: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          business_id: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          priority?: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          business_id?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          priority?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_actions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_actions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_conflicts: {
        Row: {
          business_id: string | null
          created_at: string
          field_key: string
          id: string
          intent_id: string | null
          resolution: Json | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          values_json: Json
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          field_key: string
          id?: string
          intent_id?: string | null
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          values_json: Json
        }
        Update: {
          business_id?: string | null
          created_at?: string
          field_key?: string
          id?: string
          intent_id?: string | null
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          values_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "data_conflicts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_conflicts_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "business_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          business_id: string
          confidence: number | null
          deleted_at: string | null
          expiry_date: string | null
          file_hash: string | null
          id: string
          metadata_json: Json
          mime_type: string
          ocr_status: string
          original_filename: string
          person_id: string | null
          source: string
          storage_path: string
          type: string
          uploaded_at: string
          uploaded_by: string
          verification_status: string
          verified: boolean
        }
        Insert: {
          business_id: string
          confidence?: number | null
          deleted_at?: string | null
          expiry_date?: string | null
          file_hash?: string | null
          id?: string
          metadata_json?: Json
          mime_type: string
          ocr_status?: string
          original_filename: string
          person_id?: string | null
          source?: string
          storage_path: string
          type: string
          uploaded_at?: string
          uploaded_by: string
          verification_status?: string
          verified?: boolean
        }
        Update: {
          business_id?: string
          confidence?: number | null
          deleted_at?: string | null
          expiry_date?: string | null
          file_hash?: string | null
          id?: string
          metadata_json?: Json
          mime_type?: string
          ocr_status?: string
          original_filename?: string
          person_id?: string | null
          source?: string
          storage_path?: string
          type?: string
          uploaded_at?: string
          uploaded_by?: string
          verification_status?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "business_people"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          business_id: string | null
          created_at: string
          event_type: string
          id: string
          intent_id: string | null
          payload: Json
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          intent_id?: string | null
          payload?: Json
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          intent_id?: string | null
          payload?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "business_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      field_facts: {
        Row: {
          business_id: string | null
          confidence: number
          created_at: string
          establishment_id: string | null
          field_key: string
          id: string
          identity_verification_id: string | null
          intent_id: string | null
          source_reference: string | null
          source_type: string
          updated_at: string
          value_json: Json
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          business_id?: string | null
          confidence?: number
          created_at?: string
          establishment_id?: string | null
          field_key: string
          id?: string
          identity_verification_id?: string | null
          intent_id?: string | null
          source_reference?: string | null
          source_type: string
          updated_at?: string
          value_json: Json
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          business_id?: string | null
          confidence?: number
          created_at?: string
          establishment_id?: string | null
          field_key?: string
          id?: string
          identity_verification_id?: string | null
          intent_id?: string | null
          source_reference?: string | null
          source_type?: string
          updated_at?: string
          value_json?: Json
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_facts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_facts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "business_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_facts_identity_verification_id_fkey"
            columns: ["identity_verification_id"]
            isOneToOne: false
            referencedRelation: "kyc_verifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_facts_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "business_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      government_queries: {
        Row: {
          ai_analysis: Json
          application_id: string
          classification: string | null
          created_at: string
          deadline: string | null
          draft_response: string | null
          id: string
          query_text: string
          received_at: string
          required_documents: Json
          response_submitted_at: string | null
          staff_review_required: boolean
          status: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json
          application_id: string
          classification?: string | null
          created_at?: string
          deadline?: string | null
          draft_response?: string | null
          id?: string
          query_text: string
          received_at?: string
          required_documents?: Json
          response_submitted_at?: string | null
          staff_review_required?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json
          application_id?: string
          classification?: string | null
          created_at?: string
          deadline?: string | null
          draft_response?: string | null
          id?: string
          query_text?: string
          received_at?: string
          required_documents?: Json
          response_submitted_at?: string | null
          staff_review_required?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "government_queries_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_workflow_packs: {
        Row: {
          created_at: string
          intent_id: string
          pack_id: string
          source: string
        }
        Insert: {
          created_at?: string
          intent_id: string
          pack_id: string
          source?: string
        }
        Update: {
          created_at?: string
          intent_id?: string
          pack_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_workflow_packs_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "business_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_workflow_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "workflow_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          business_id: string | null
          consent_purpose: string
          created_at: string
          id: string
          identifier_hash: string
          identifier_last_four: string
          identifier_type: string
          normalized_data: Json
          provider: string
          provider_reference_id: string | null
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          business_id?: string | null
          consent_purpose: string
          created_at?: string
          id?: string
          identifier_hash: string
          identifier_last_four: string
          identifier_type: string
          normalized_data?: Json
          provider?: string
          provider_reference_id?: string | null
          status: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          business_id?: string | null
          consent_purpose?: string
          created_at?: string
          id?: string
          identifier_hash?: string
          identifier_last_four?: string
          identifier_type?: string
          normalized_data?: Json
          provider?: string
          provider_reference_id?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          branch_id: string | null
          business_id: string
          certificate_document_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          licence_number: string
          service_id: string
          status: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          certificate_document_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          licence_number: string
          service_id: string
          status?: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          certificate_document_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          licence_number?: string
          service_id?: string
          status?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_certificate_document_id_fkey"
            columns: ["certificate_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          answer_json: Json
          created_at: string
          id: string
          question_key: string
          session_id: string
          source: string
        }
        Insert: {
          answer_json: Json
          created_at?: string
          id?: string
          question_key: string
          session_id: string
          source?: string
        }
        Update: {
          answer_json?: Json
          created_at?: string
          id?: string
          question_key?: string
          session_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "onboarding_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_sessions: {
        Row: {
          completed_at: string | null
          completion_percentage: number
          current_question_key: string | null
          current_stage: string
          id: string
          intent_id: string
          last_activity_at: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number
          current_question_key?: string | null
          current_stage?: string
          id?: string
          intent_id: string
          last_activity_at?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number
          current_question_key?: string | null
          current_stage?: string
          id?: string
          intent_id?: string
          last_activity_at?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: true
            referencedRelation: "business_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          government_fee: number
          id: string
          order_id: string
          service_fee: number
          service_id: string
        }
        Insert: {
          created_at?: string
          government_fee?: number
          id?: string
          order_id: string
          service_fee: number
          service_id: string
        }
        Update: {
          created_at?: string
          government_fee?: number
          id?: string
          order_id?: string
          service_fee?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          id: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payment_id: string | null
          refund_status: string | null
          status: string
          tax: number
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          paid_at?: string | null
          payment_method?: string | null
          provider: string
          provider_payment_id?: string | null
          refund_status?: string | null
          status: string
          tax?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: string | null
          provider?: string
          provider_payment_id?: string | null
          refund_status?: string | null
          status?: string
          tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_status: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_status?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_status?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      registration_catalog: {
        Row: {
          active: boolean
          authority: string
          category: string
          city: string | null
          code: string
          country: string
          created_at: string
          id: string
          level: string
          name: string
          state: string | null
        }
        Insert: {
          active?: boolean
          authority: string
          category: string
          city?: string | null
          code: string
          country?: string
          created_at?: string
          id?: string
          level: string
          name: string
          state?: string | null
        }
        Update: {
          active?: boolean
          authority?: string
          category?: string
          city?: string | null
          code?: string
          country?: string
          created_at?: string
          id?: string
          level?: string
          name?: string
          state?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          api_available: boolean
          category: string
          created_at: string
          description: string
          documents_schema: Json
          form_schema: Json
          government_authority: string | null
          government_fee_logic: Json
          id: string
          jurisdiction: string
          manual_review_required: boolean
          name: string
          portal_assisted: boolean
          pricing_type: string
          processing_method: string
          service_fee: number
          slug: string
          updated_at: string
          workflow_definition: Json
        }
        Insert: {
          active?: boolean
          api_available?: boolean
          category: string
          created_at?: string
          description: string
          documents_schema?: Json
          form_schema?: Json
          government_authority?: string | null
          government_fee_logic?: Json
          id?: string
          jurisdiction?: string
          manual_review_required?: boolean
          name: string
          portal_assisted?: boolean
          pricing_type?: string
          processing_method: string
          service_fee?: number
          slug: string
          updated_at?: string
          workflow_definition?: Json
        }
        Update: {
          active?: boolean
          api_available?: boolean
          category?: string
          created_at?: string
          description?: string
          documents_schema?: Json
          form_schema?: Json
          government_authority?: string | null
          government_fee_logic?: Json
          id?: string
          jurisdiction?: string
          manual_review_required?: boolean
          name?: string
          portal_assisted?: boolean
          pricing_type?: string
          processing_method?: string
          service_fee?: number
          slug?: string
          updated_at?: string
          workflow_definition?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_period: string | null
          business_id: string
          created_at: string
          id: string
          plan: string
          provider_subscription_id: string | null
          renewal_date: string | null
          settings: Json
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_period?: string | null
          business_id: string
          created_at?: string
          id?: string
          plan: string
          provider_subscription_id?: string | null
          renewal_date?: string | null
          settings?: Json
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_period?: string | null
          business_id?: string
          created_at?: string
          id?: string
          plan?: string
          provider_subscription_id?: string | null
          renewal_date?: string | null
          settings?: Json
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          service_id: string
          steps_json: Json
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          service_id: string
          steps_json: Json
          version: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          service_id?: string
          steps_json?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_pack_requirements: {
        Row: {
          condition_json: Json
          created_at: string
          expected_answer_type: string
          field_key: string
          help_text: string | null
          id: string
          options_json: Json
          pack_id: string
          preferred_source: string
          priority: number
          question_text: string
          requirement_type: string
        }
        Insert: {
          condition_json?: Json
          created_at?: string
          expected_answer_type?: string
          field_key: string
          help_text?: string | null
          id?: string
          options_json?: Json
          pack_id: string
          preferred_source?: string
          priority?: number
          question_text: string
          requirement_type: string
        }
        Update: {
          condition_json?: Json
          created_at?: string
          expected_answer_type?: string
          field_key?: string
          help_text?: string | null
          id?: string
          options_json?: Json
          pack_id?: string
          preferred_source?: string
          priority?: number
          question_text?: string
          requirement_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_pack_requirements_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "workflow_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_packs: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description: string
          id?: string
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      workflow_tasks: {
        Row: {
          application_id: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_json: Json
          name: string
          output_json: Json
          requires_automation: boolean
          requires_customer: boolean
          requires_staff: boolean
          retry_count: number
          started_at: string | null
          status: string
          step_code: string
          type: string
        }
        Insert: {
          application_id: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json?: Json
          name: string
          output_json?: Json
          requires_automation?: boolean
          requires_customer?: boolean
          requires_staff?: boolean
          retry_count?: number
          started_at?: string | null
          status?: string
          step_code: string
          type: string
        }
        Update: {
          application_id?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json?: Json
          name?: string
          output_json?: Json
          requires_automation?: boolean
          requires_customer?: boolean
          requires_staff?: boolean
          retry_count?: number
          started_at?: string | null
          status?: string
          step_code?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_onboarding_requirement: {
        Args: { target_session_id: string }
        Returns: {
          completion_percentage: number
          expected_answer_type: string
          field_key: string
          help_text: string
          options_json: Json
          preferred_source: string
          question_text: string
        }[]
      }
      run_compliance_scan: {
        Args: { target_business_id: string }
        Returns: {
          confidence: number
          reason: string
          result_id: string
          service_fee: number
          service_id: string
          service_name: string
          service_slug: string
          source_url: string
          status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
