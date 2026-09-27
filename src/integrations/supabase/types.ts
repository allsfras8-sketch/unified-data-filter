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
      accounts: {
        Row: {
          code: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          is_group: boolean
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          notes: string | null
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          is_group?: boolean
          name: string
          nature?: Database["public"]["Enums"]["account_nature"]
          notes?: string | null
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          is_group?: boolean
          name?: string
          nature?: Database["public"]["Enums"]["account_nature"]
          notes?: string | null
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          account_id: string | null
          account_no: string | null
          branch: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          account_id?: string | null
          account_no?: string | null
          branch?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          account_id?: string | null
          account_no?: string | null
          branch?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          project_id: string
          qty: number
          tenant_id: string
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          project_id: string
          qty?: number
          tenant_id: string
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          project_id?: string
          qty?: number
          tenant_id?: string
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          amount: number
          bank_id: string | null
          cheque_no: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          direction: string
          due_date: string
          id: string
          issue_date: string
          notes: string | null
          partner_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          bank_id?: string | null
          cheque_no: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          direction?: string
          due_date?: string
          id?: string
          issue_date?: string
          notes?: string | null
          partner_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          cheque_no?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          direction?: string
          due_date?: string
          id?: string
          issue_date?: string
          notes?: string | null
          partner_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheques_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_lines: {
        Row: {
          created_at: string
          document_id: string
          id: string
          product_id: string
          qty: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          product_id: string
          qty: number
          tenant_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          product_id?: string
          qty?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          doc_date: string
          doc_no: number | null
          doc_type: string
          exchange_rate: number
          id: string
          journal_entry_id: string | null
          notes: string | null
          partner_id: string | null
          project_id: string | null
          status: string
          tenant_id: string
          to_warehouse_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          doc_date?: string
          doc_no?: number | null
          doc_type: string
          exchange_rate?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          partner_id?: string | null
          project_id?: string | null
          status?: string
          tenant_id: string
          to_warehouse_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          doc_date?: string
          doc_no?: number | null
          doc_type?: string
          exchange_rate?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          partner_id?: string | null
          project_id?: string | null
          status?: string
          tenant_id?: string
          to_warehouse_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          rate_date: string
          rate_to_usd: number
          tenant_id: string
        }
        Insert: {
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate_date?: string
          rate_to_usd: number
          tenant_id: string
        }
        Update: {
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate_date?: string
          rate_to_usd?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          account_id: string | null
          code: string | null
          cost: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          name: string
          notes: string | null
          purchase_date: string
          salvage_value: number
          tenant_id: string
          useful_life_years: number
        }
        Insert: {
          account_id?: string | null
          code?: string | null
          cost: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          name: string
          notes?: string | null
          purchase_date?: string
          salvage_value?: number
          tenant_id: string
          useful_life_years?: number
        }
        Update: {
          account_id?: string | null
          code?: string | null
          cost?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          name?: string
          notes?: string | null
          purchase_date?: string
          salvage_value?: number
          tenant_id?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          doc_type: string
          document_id: string | null
          entry_date: string
          entry_no: number
          exchange_rate: number
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          doc_type?: string
          document_id?: string | null
          entry_date?: string
          entry_no: number
          exchange_rate?: number
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          doc_type?: string
          document_id?: string | null
          entry_date?: string
          entry_no?: number
          exchange_rate?: number
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
          partner_id: string | null
          project_id: string | null
          tenant_id: string
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
          partner_id?: string | null
          project_id?: string | null
          tenant_id: string
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
          partner_id?: string | null
          project_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          account_id: string | null
          address: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          partner_type: string
          phone: string | null
          tenant_id: string
        }
        Insert: {
          account_id?: string | null
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          partner_type?: string
          phone?: string | null
          tenant_id: string
        }
        Update: {
          account_id?: string | null
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          partner_type?: string
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_cost: number
          barcode: string | null
          category: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          default_warehouse_id: string | null
          id: string
          last_purchase_price: number
          name: string
          qty_on_hand: number
          reorder_level: number
          sku: string
          tenant_id: string
          unit: string
        }
        Insert: {
          avg_cost?: number
          barcode?: string | null
          category?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          default_warehouse_id?: string | null
          id?: string
          last_purchase_price?: number
          name: string
          qty_on_hand?: number
          reorder_level?: number
          sku: string
          tenant_id: string
          unit?: string
        }
        Update: {
          avg_cost?: number
          barcode?: string | null
          category?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          default_warehouse_id?: string | null
          id?: string
          last_purchase_price?: number
          name?: string
          qty_on_hand?: number
          reorder_level?: number
          sku?: string
          tenant_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_super_admin: boolean
          is_tenant_admin: boolean
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          is_super_admin?: boolean
          is_tenant_admin?: boolean
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_super_admin?: boolean
          is_tenant_admin?: boolean
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          description: string
          expense_date: string
          id: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description: string
          expense_date?: string
          id?: string
          project_id: string
          tenant_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string
          expense_date?: string
          id?: string
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoiced: boolean
          is_done: boolean
          name: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoiced?: boolean
          is_done?: boolean
          name: string
          project_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoiced?: boolean
          is_done?: boolean
          name?: string
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          code: string | null
          completion_pct: number
          contract_value: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          end_date: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          client_id?: string | null
          code?: string | null
          completion_pct?: number
          contract_value?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          client_id?: string | null
          code?: string | null
          completion_pct?: number
          contract_value?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_moves: {
        Row: {
          created_at: string
          direction: string
          document_id: string | null
          id: string
          move_date: string
          partner_id: string | null
          product_id: string
          project_id: string | null
          qty: number
          reference: string | null
          tenant_id: string
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          document_id?: string | null
          id?: string
          move_date?: string
          partner_id?: string | null
          product_id: string
          project_id?: string | null
          qty: number
          reference?: string | null
          tenant_id: string
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          document_id?: string | null
          id?: string
          move_date?: string
          partner_id?: string | null
          product_id?: string
          project_id?: string | null
          qty?: number
          reference?: string | null
          tenant_id?: string
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          plan: string
          start_date: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          notes?: string | null
          plan: string
          start_date: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          plan?: string
          start_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          enabled: boolean
          id: string
          module: string
          tenant_id: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          module: string
          tenant_id: string
        }
        Update: {
          enabled?: boolean
          id?: string
          module?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          cash_account_id: string | null
          cogs_account_id: string | null
          customers_account_id: string | null
          inventory_account_id: string | null
          project_cost_account_id: string | null
          sales_account_id: string | null
          suppliers_account_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cash_account_id?: string | null
          cogs_account_id?: string | null
          customers_account_id?: string | null
          inventory_account_id?: string | null
          project_cost_account_id?: string | null
          sales_account_id?: string | null
          suppliers_account_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cash_account_id?: string | null
          cogs_account_id?: string | null
          customers_account_id?: string | null
          inventory_account_id?: string | null
          project_cost_account_id?: string | null
          sales_account_id?: string | null
          suppliers_account_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_cogs_account_id_fkey"
            columns: ["cogs_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_customers_account_id_fkey"
            columns: ["customers_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_inventory_account_id_fkey"
            columns: ["inventory_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_project_cost_account_id_fkey"
            columns: ["project_cost_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_sales_account_id_fkey"
            columns: ["sales_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_suppliers_account_id_fkey"
            columns: ["suppliers_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          max_users: number
          name: string
          notes: string | null
          phone: string | null
          plan: string
          sub_end: string
          sub_start: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_users?: number
          name: string
          notes?: string | null
          phone?: string | null
          plan?: string
          sub_end?: string
          sub_start?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_users?: number
          name?: string
          notes?: string | null
          phone?: string | null
          plan?: string
          sub_end?: string
          sub_start?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          id: string
          module: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module: string
          tenant_id: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          code: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_super_admin: { Args: never; Returns: boolean }
      current_tenant_id: { Args: never; Returns: string }
      has_perm: {
        Args: {
          _action: Database["public"]["Enums"]["perm_action"]
          _module: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      post_document: { Args: { _id: string }; Returns: string }
      tenant_active: { Args: never; Returns: boolean }
      unpost_document: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      account_nature: "closing" | "balance_sheet" | "profit_loss"
      currency_code: "USD" | "SYP"
      perm_action: "view" | "create" | "edit" | "delete"
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
    Enums: {
      account_nature: ["closing", "balance_sheet", "profit_loss"],
      currency_code: ["USD", "SYP"],
      perm_action: ["view", "create", "edit", "delete"],
    },
  },
} as const
