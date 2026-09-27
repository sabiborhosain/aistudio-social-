import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  AlertTriangle,
  HardDrive,
  Mail,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  Search,
  KeyRound,
  Sliders,
  Database,
  Lock,
  Radio,
  Check,
  Globe,
  Settings as SettingsIcon,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { AdminStats, AdminReport } from '../../types.ts';
import { apiRequest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

type SettingsSection = 'general' | 'r2' | 'smtp' | 'security';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'kpis' | 'users' | 'moderation' | 'settings' | 'logs'>('kpis');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSection>('r2');

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // User management
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Moderation
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // General Settings
  const [generalConfig, setGeneralConfig] = useState({
    siteName: 'DevSphere Social',
    siteTagline: 'The Social Network for Developers & Engineers',
    siteDescription: 'Connect, share code blocks, watch reels, and collaborate with tech minds worldwide.',
    allowRegistration: true,
    emailVerificationRequired: false,
    maxUploadSizeMb: 50
  });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSavedNotice, setGeneralSavedNotice] = useState(false);

  // R2 Config
  const [r2Config, setR2Config] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: 'devsphere-media',
    endpoint: '',
    publicUrl: '',
    isActive: false,
    isConfigured: false
  });
  const [showR2Secret, setShowR2Secret] = useState(false);
  const [testingR2, setTestingR2] = useState(false);
  const [r2ConnectionStatus, setR2ConnectionStatus] = useState<
    'Configured' | 'Not Configured' | 'Connection Successful' | 'Connection Failed'
  >('Not Configured');
  const [r2TestResult, setR2TestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingR2, setSavingR2] = useState(false);

  // SMTP Config
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls' as 'tls' | 'ssl' | 'none',
    fromEmail: 'no-reply@devsphere.com',
    fromName: 'DevSphere Social',
    isActive: false,
    isConfigured: false
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpConnectionStatus, setSmtpConnectionStatus] = useState<
    'Configured' | 'Not Configured' | 'Connection Successful' | 'Connection Failed'
  >('Not Configured');
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingSmtp, setSavingSmtp] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch KPI Stats
  const fetchStats = async () => {
    setLoadingStats(true);
    const res = await apiRequest<AdminStats>('/admin/stats');
    if (res.success && res.data) {
      setStats(res.data);
      if (res.data.storage.isConfigured) {
        setR2ConnectionStatus('Configured');
      } else {
        setR2ConnectionStatus('Not Configured');
      }
      if (res.data.smtp?.isConfigured) {
        setSmtpConnectionStatus('Configured');
      } else {
        setSmtpConnectionStatus('Not Configured');
      }
    }
    setLoadingStats(false);
  };

  // Fetch Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    const res = await apiRequest<any[]>('/admin/users');
    if (res.success && res.data) {
      setUsersList(res.data);
    }
    setLoadingUsers(false);
  };

  // Fetch Reports
  const fetchReports = async () => {
    setLoadingReports(true);
    const res = await apiRequest<AdminReport[]>('/admin/reports');
    if (res.success && res.data) {
      setReports(res.data);
    }
    setLoadingReports(false);
  };

  // Fetch General settings
  const fetchGeneralSettings = async () => {
    const res = await apiRequest<any>('/admin/settings/general');
    if (res.success && res.data) {
      setGeneralConfig({
        siteName: res.data.site_name || 'DevSphere Social',
        siteTagline: res.data.site_tagline || '',
        siteDescription: res.data.site_description || '',
        allowRegistration: res.data.allow_registration === '1' || res.data.allow_registration === true,
        emailVerificationRequired: res.data.email_verification_required === '1' || res.data.email_verification_required === true,
        maxUploadSizeMb: Number(res.data.max_upload_size_mb) || 50
      });
    }
  };

  // Fetch R2 settings
  const fetchR2 = async () => {
    const res = await apiRequest<any>('/admin/settings/r2');
    if (res.success && res.data) {
      const isConfigured = Boolean(res.data.is_configured);
      setR2Config({
        accountId: res.data.account_id || '',
        accessKeyId: res.data.access_key_id || '',
        secretAccessKey: res.data.secret_access_key || '',
        bucketName: res.data.bucket_name || 'devsphere-media',
        endpoint: res.data.endpoint || '',
        publicUrl: res.data.public_url || '',
        isActive: res.data.is_active === true || res.data.is_active === 1,
        isConfigured
      });
      setR2ConnectionStatus(isConfigured ? 'Configured' : 'Not Configured');
    }
  };

  // Fetch SMTP settings
  const fetchSmtp = async () => {
    const res = await apiRequest<any>('/admin/settings/smtp');
    if (res.success && res.data) {
      const isConfigured = Boolean(res.data.is_configured);
      setSmtpConfig({
        host: res.data.host || '',
        port: Number(res.data.port) || 587,
        username: res.data.username || '',
        password: res.data.password || '',
        encryption: res.data.encryption || 'tls',
        fromEmail: res.data.from_email || 'no-reply@devsphere.com',
        fromName: res.data.from_name || 'DevSphere Social',
        isActive: res.data.is_active === true || res.data.is_active === 1,
        isConfigured
      });
      setSmtpConnectionStatus(isConfigured ? 'Configured' : 'Not Configured');
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    const res = await apiRequest<any[]>('/admin/logs');
    if (res.success && res.data) {
      setAuditLogs(res.data);
    }
    setLoadingLogs(false);
  };

  useEffect(() => {
    fetchStats();
    fetchGeneralSettings();
    fetchR2();
    fetchSmtp();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'moderation') fetchReports();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'settings') {
      fetchGeneralSettings();
      fetchR2();
      fetchSmtp();
    }
  }, [activeTab]);

  // Actions for User Management
  const handleUpdateUserStatus = async (userId: number, newStatus: string) => {
    const res = await apiRequest(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: { status: newStatus }
    });
    if (res.success) {
      fetchUsers();
      fetchStats();
    } else {
      alert(res.message || 'Status update failed');
    }
  };

  const handleTriggerPasswordReset = async (userId: number) => {
    const res = await apiRequest(`/admin/users/${userId}/reset-password`, {
      method: 'POST'
    });
    if (res.success) {
      alert(`Temporary password generated: ${res.data?.tempPassword}\nUser will be prompted to change it on next login.`);
      fetchUsers();
    } else {
      alert(res.message || 'Failed to trigger reset');
    }
  };

  // Actions for Moderation
  const handleResolveReport = async (reportId: number, action: 'DISMISS' | 'DELETE_CONTENT') => {
    const res = await apiRequest(`/admin/reports/${reportId}/resolve`, {
      method: 'POST',
      body: { action }
    });
    if (res.success) {
      fetchReports();
      fetchStats();
    } else {
      alert(res.message || 'Resolution failed');
    }
  };

  // Actions for General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    setGeneralSavedNotice(false);
    const res = await apiRequest('/admin/settings/general', {
      method: 'PUT',
      body: {
        site_name: generalConfig.siteName,
        site_tagline: generalConfig.siteTagline,
        site_description: generalConfig.siteDescription,
        allow_registration: generalConfig.allowRegistration ? '1' : '0',
        email_verification_required: generalConfig.emailVerificationRequired ? '1' : '0',
        max_upload_size_mb: generalConfig.maxUploadSizeMb
      }
    });
    setSavingGeneral(false);
    if (res.success) {
      setGeneralSavedNotice(true);
      setTimeout(() => setGeneralSavedNotice(false), 3500);
      fetchStats();
    } else {
      alert(res.message || 'Failed to save general settings');
    }
  };

  // Actions for R2 Storage
  const handleTestR2 = async () => {
    setTestingR2(true);
    setR2TestResult(null);
    const res = await apiRequest<any>('/admin/settings/r2/test', {
      method: 'POST',
      body: {
        accountId: r2Config.accountId,
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
        bucketName: r2Config.bucketName,
        endpoint: r2Config.endpoint
      }
    });
    setTestingR2(false);
    if (res.success) {
      setR2ConnectionStatus('Connection Successful');
      setR2TestResult({
        success: true,
        message: res.message || 'Successfully connected to Cloudflare R2 bucket!'
      });
    } else {
      setR2ConnectionStatus('Connection Failed');
      setR2TestResult({
        success: false,
        message: res.message || 'Failed connecting to Cloudflare R2 bucket. Verify credentials and bucket.'
      });
    }
  };

  const handleSaveR2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingR2(true);
    const res = await apiRequest<any>('/admin/settings/r2', {
      method: 'PUT',
      body: {
        account_id: r2Config.accountId,
        access_key_id: r2Config.accessKeyId,
        secret_access_key: r2Config.secretAccessKey,
        bucket_name: r2Config.bucketName,
        endpoint: r2Config.endpoint,
        public_url: r2Config.publicUrl,
        is_active: r2Config.isActive
      }
    });
    setSavingR2(false);
    if (res.success) {
      alert('Cloudflare R2 settings saved successfully! Sensitive keys encrypted at rest.');
      fetchR2();
      fetchStats();
    } else {
      alert(res.message || 'Failed to save R2 settings');
    }
  };

  // Actions for SMTP Email
  const handleTestSmtp = async () => {
    if (!testEmailRecipient) {
      alert('Please enter a recipient test email address.');
      return;
    }
    setTestingSmtp(true);
    setSmtpTestResult(null);
    const res = await apiRequest<any>('/admin/settings/smtp/test', {
      method: 'POST',
      body: {
        recipient: testEmailRecipient,
        testEmail: testEmailRecipient
      }
    });
    setTestingSmtp(false);
    if (res.success) {
      setSmtpConnectionStatus('Connection Successful');
      setSmtpTestResult({
        success: true,
        message: res.message || `Diagnostic verification email dispatched to ${testEmailRecipient}!`
      });
    } else {
      setSmtpConnectionStatus('Connection Failed');
      setSmtpTestResult({
        success: false,
        message: res.message || 'SMTP diagnostic test failed. Check host, username, and password.'
      });
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    const res = await apiRequest<any>('/admin/settings/smtp', {
      method: 'PUT',
      body: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        username: smtpConfig.username,
        password: smtpConfig.password,
        encryption: smtpConfig.encryption,
        from_email: smtpConfig.fromEmail,
        from_name: smtpConfig.fromName,
        is_active: smtpConfig.isActive
      }
    });
    setSavingSmtp(false);
    if (res.success) {
      alert('SMTP settings saved successfully! Sensitive password encrypted at rest.');
      fetchSmtp();
      fetchStats();
    } else {
      alert(res.message || 'Failed to save SMTP settings');
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchSearch =
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.profile?.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.profile?.full_name?.toLowerCase().includes(userSearch.toLowerCase());
    const matchStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-0">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 text-white shadow-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Shield className="w-7 h-7" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Super Admin Control Hub</h1>
          </div>
          <p className="text-xs sm:text-sm text-amber-100 mt-1">
            Governing DevSphere: Database, Users, R2 Storage, SMTP & Security
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center space-x-2 bg-black/25 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-xs">
            <Database className="w-4 h-4 text-emerald-300" />
            <span className="font-semibold">{stats?.database?.engine || 'MySQL 8.0 Engine'}</span>
          </div>
          <div className="flex items-center space-x-2 bg-black/25 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-xs">
            <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span className="font-semibold">Node.js + WebSockets Live</span>
          </div>
        </div>
      </div>

      {/* Global Warning Banners if R2 or SMTP is unconfigured */}
      {(!stats?.storage?.isConfigured || !stats?.smtp?.isConfigured) && (
        <div className="space-y-3 mb-6">
          {!stats?.storage?.isConfigured && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold">Cloudflare R2 is not configured.</span>
                  <span className="ml-1 text-amber-800 dark:text-amber-300">
                    Media uploads are currently safely stored using local storage. Configure Cloudflare R2 to enable zero-egress cloud storage.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setSettingsSubTab('r2');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold whitespace-nowrap self-start sm:self-auto"
              >
                Configure Cloudflare R2
              </button>
            </div>
          )}

          {!stats?.smtp?.isConfigured && (
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center space-x-3">
                <Mail className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold">SMTP is not configured.</span>
                  <span className="ml-1 text-sky-800 dark:text-sky-300">
                    Verification emails and OTPs are currently simulated in development preview mode. Configure SMTP to send live emails.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setSettingsSubTab('smtp');
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold whitespace-nowrap self-start sm:self-auto"
              >
                Configure SMTP
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'kpis'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System KPIs</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'moderation'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Moderation Queue {stats?.moderation.pendingReports ? `(${stats.moderation.pendingReports})` : ''}</span>
        </button>

        {/* PRIMARY SETTINGS TAB (Contains General, Storage / Cloudflare R2, Email / SMTP, Security) */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'settings'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'logs'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: SYSTEM KPIS */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          {loadingStats || !stats ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading system metrics...</div>
          ) : (
            <>
              {/* User KPIs */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Account Infrastructure
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-slate-500">Total Users</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {stats.users.total}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active Accounts</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {stats.users.active}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Suspended</span>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                      {stats.users.suspended}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Banned</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                      {stats.users.banned}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content KPIs */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Content Volume & Engagement
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-slate-500">Total Posts</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.content.totalPosts}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">Code Snippets</span>
                    <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                      {stats.content.codePosts}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-slate-500">Comments</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.content.totalComments}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-slate-500">Short Reels</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.content.totalReels}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs text-slate-500">Dev Pages</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.content.totalPages}
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage & Mail Engine Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <HardDrive className="w-8 h-8 text-sky-500" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cloudflare R2</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stats.storage.isConfigured
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {stats.storage.isConfigured ? 'Configured' : 'Not Configured'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {stats.storage.r2Active
                          ? `Active Bucket: ${stats.storage.bucket || 'devsphere-media'}`
                          : 'Local Resilient Storage Fallback (/uploads)'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setSettingsSubTab('r2');
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Configure
                  </button>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-8 h-8 text-emerald-500" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">SMTP Email Server</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stats.smtp?.isConfigured
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {stats.smtp?.isConfigured ? 'Configured' : 'Not Configured'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {stats.smtp?.isConfigured
                          ? `Host: ${stats.smtp.host}`
                          : 'Development Simulated Dispatch Active'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setSettingsSubTab('smtp');
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Configure
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users by name, email, handle..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={userStatusFilter}
                onChange={e => setUserStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="BANNED">BANNED</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      Loading user records...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No users match the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={u.profile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.profile?.username || u.id}`}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {u.profile?.full_name || u.profile?.username || 'User'}
                            </div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : u.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : u.status === 'SUSPENDED'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {new Date(u.createdAt || u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {u.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'SUSPENDED')}
                              className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 text-[11px] font-semibold hover:bg-amber-100"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'ACTIVE')}
                              className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[11px] font-semibold hover:bg-emerald-100"
                            >
                              Reactivate
                            </button>
                          )}

                          {u.status !== 'BANNED' && (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'BANNED')}
                              className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-[11px] font-semibold hover:bg-rose-100"
                            >
                              Ban
                            </button>
                          )}

                          <button
                            onClick={() => handleTriggerPasswordReset(u.id)}
                            title="Generate temporary password"
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MODERATION QUEUE */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Flagged Content Reports</h3>
            <button onClick={fetchReports} className="text-xs text-sky-600 hover:underline">
              Refresh Reports
            </button>
          </div>

          {loadingReports ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading moderation queue...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">No Pending Reports</h4>
              <p className="text-xs text-slate-500 mt-1">DevSphere community content is clear!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div
                  key={r.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {r.reported_type} #{r.reported_id}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Reason: {r.reason}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Reported by @{r.reporter?.username} on {new Date(r.created_at).toLocaleDateString()}
                    </p>

                    {r.entityPreview && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 line-clamp-2">
                        Preview: {r.entityPreview.content || r.entityPreview.title || 'Attached Media'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleResolveReport(r.id, 'DISMISS')}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'DELETE_CONTENT')}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-2xs"
                    >
                      Delete Content
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRIMARY SETTINGS HUB (General, Cloudflare R2, SMTP, Security) */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Settings Sub-Navigation */}
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
            <button
              onClick={() => setSettingsSubTab('general')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                settingsSubTab === 'general'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>General</span>
            </button>

            <button
              onClick={() => setSettingsSubTab('r2')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                settingsSubTab === 'r2'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Storage / Cloudflare R2</span>
              {r2Config.isConfigured ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setSettingsSubTab('smtp')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                settingsSubTab === 'smtp'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email / SMTP</span>
              {smtpConfig.isConfigured ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setSettingsSubTab('security')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                settingsSubTab === 'security'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Security</span>
            </button>
          </div>

          {/* SUBTAB 4.1: GENERAL SETTINGS */}
          {settingsSubTab === 'general' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs max-w-2xl mx-auto">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <Globe className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    General Platform Configuration
                  </h3>
                  <p className="text-xs text-slate-500">
                    Core identity, registration controls, and system limits
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={generalConfig.siteName}
                    onChange={e => setGeneralConfig({ ...generalConfig, siteName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Platform Tagline
                  </label>
                  <input
                    type="text"
                    value={generalConfig.siteTagline}
                    onChange={e => setGeneralConfig({ ...generalConfig, siteTagline: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={generalConfig.siteDescription}
                    onChange={e => setGeneralConfig({ ...generalConfig, siteDescription: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Allow Registration
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Enable public sign-up flow
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={generalConfig.allowRegistration}
                      onChange={e => setGeneralConfig({ ...generalConfig, allowRegistration: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Email Verification
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Require 6-digit OTP code
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={generalConfig.emailVerificationRequired}
                      onChange={e => setGeneralConfig({ ...generalConfig, emailVerificationRequired: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Upload File Size (MB)
                  </label>
                  <input
                    type="number"
                    value={generalConfig.maxUploadSizeMb}
                    onChange={e => setGeneralConfig({ ...generalConfig, maxUploadSizeMb: Number(e.target.value) || 50 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                {generalSavedNotice && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>General settings saved successfully to MySQL / persistent storage!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingGeneral}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 mt-2"
                >
                  {savingGeneral ? 'Saving...' : 'Save General Settings'}
                </button>
              </form>
            </div>
          )}

          {/* SUBTAB 4.2: STORAGE / CLOUDFLARE R2 */}
          {settingsSubTab === 'r2' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-6 h-6 text-sky-500" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Cloudflare R2 Object Storage
                    </h3>
                    <p className="text-xs text-slate-500">
                      Zero-egress media storage for photos, posts, reels, videos & audio tracks
                    </p>
                  </div>
                </div>

                {/* Connection Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    r2ConnectionStatus === 'Configured'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : r2ConnectionStatus === 'Connection Successful'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : r2ConnectionStatus === 'Connection Failed'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {r2ConnectionStatus}
                </span>
              </div>

              {/* Status Warning Banner if not configured */}
              {!r2Config.isConfigured && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Cloudflare R2 is not configured.</span>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      The website will start normally without disruption. Enter your Cloudflare R2 credentials below and click Save Settings to stream all media to your bucket.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveR2} className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Activate Cloudflare R2 for All Media
                    </span>
                    <span className="text-[11px] text-slate-400">
                      When enabled, all media uploads stream directly to your Cloudflare R2 bucket.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={r2Config.isActive}
                    onChange={e => setR2Config({ ...r2Config, isActive: e.target.checked })}
                    className="w-5 h-5 accent-sky-600 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account ID
                  </label>
                  <input
                    type="text"
                    value={r2Config.accountId}
                    onChange={e => {
                      const id = e.target.value;
                      setR2Config({
                        ...r2Config,
                        accountId: id,
                        endpoint: id && !r2Config.endpoint ? `https://${id}.r2.cloudflarestorage.com` : r2Config.endpoint
                      });
                    }}
                    placeholder="e.g. 7c9d4b68019e496cb88a..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Access Key ID
                    </label>
                    <input
                      type="text"
                      value={r2Config.accessKeyId}
                      onChange={e => setR2Config({ ...r2Config, accessKeyId: e.target.value })}
                      placeholder="2a5676e193e..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Secret Access Key</span>
                      <button
                        type="button"
                        onClick={() => setShowR2Secret(!showR2Secret)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center space-x-1"
                      >
                        {showR2Secret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showR2Secret ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </label>
                    <input
                      type={showR2Secret ? 'text' : 'password'}
                      value={r2Config.secretAccessKey}
                      onChange={e => setR2Config({ ...r2Config, secretAccessKey: e.target.value })}
                      placeholder="••••••••••••••••"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Encrypted at rest with AES-256-GCM. Never exposed in plain text.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Bucket Name
                    </label>
                    <input
                      type="text"
                      value={r2Config.bucketName}
                      onChange={e => setR2Config({ ...r2Config, bucketName: e.target.value })}
                      placeholder="devsphere-media"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Endpoint
                    </label>
                    <input
                      type="text"
                      value={r2Config.endpoint}
                      onChange={e => setR2Config({ ...r2Config, endpoint: e.target.value })}
                      placeholder="https://<account_id>.r2.cloudflarestorage.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Public URL / Custom Domain
                  </label>
                  <input
                    type="text"
                    value={r2Config.publicUrl}
                    onChange={e => setR2Config({ ...r2Config, publicUrl: e.target.value })}
                    placeholder="https://cdn.devsphere.social or https://<bucket>.r2.dev"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Optional Cloudflare Custom Domain or r2.dev public bucket URL for CDN delivery.
                  </p>
                </div>

                {r2TestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      r2TestResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
                    }`}
                  >
                    {r2TestResult.message}
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={handleTestR2}
                    disabled={testingR2 || !r2Config.accessKeyId}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {testingR2 ? 'Testing Connection...' : 'Test R2 Connection'}
                  </button>

                  <button
                    type="submit"
                    disabled={savingR2}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {savingR2 ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 4.3: EMAIL / SMTP */}
          {settingsSubTab === 'smtp' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-6 h-6 text-emerald-500" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Email / SMTP Server Settings
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dispatches account activation emails, 6-digit OTPs & password resets
                    </p>
                  </div>
                </div>

                {/* Connection Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    smtpConnectionStatus === 'Configured'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : smtpConnectionStatus === 'Connection Successful'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : smtpConnectionStatus === 'Connection Failed'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {smtpConnectionStatus}
                </span>
              </div>

              {/* Status Warning Banner if not configured */}
              {!smtpConfig.isConfigured && (
                <div className="mb-4 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold">SMTP is not configured.</span>
                    <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5">
                      Website startup continues normally. Outgoing emails and OTP codes are safely simulated in development preview mode until you enter valid SMTP credentials below.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSmtp} className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Activate Live SMTP Dispatch
                    </span>
                    <span className="text-[11px] text-slate-400">
                      When enabled, real emails are dispatched via your configured mail server.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={smtpConfig.isActive}
                    onChange={e => setSmtpConfig({ ...smtpConfig, isActive: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.host}
                      onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      placeholder="mail.yourdomain.com or smtp.mailgun.org"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={smtpConfig.port}
                      onChange={e => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.username}
                      onChange={e => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                      placeholder="postmaster@yourdomain.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>SMTP Password</span>
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center space-x-1"
                      >
                        {showSmtpPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showSmtpPassword ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </label>
                    <input
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={smtpConfig.password}
                      onChange={e => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Encrypted at rest with AES-256-GCM. Never returned to normal APIs.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Encryption
                    </label>
                    <select
                      value={smtpConfig.encryption}
                      onChange={e => setSmtpConfig({ ...smtpConfig, encryption: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="tls">TLS (STARTTLS - Port 587)</option>
                      <option value="ssl">SSL (Port 465)</option>
                      <option value="none">None (Port 25)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      value={smtpConfig.fromEmail}
                      onChange={e => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                      placeholder="no-reply@devsphere.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.fromName}
                      onChange={e => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                      placeholder="DevSphere Social"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                {/* Send Diagnostic Test Email Box */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Send Diagnostic Test Email
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={e => setTestEmailRecipient(e.target.value)}
                      placeholder="recipient@example.com"
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleTestSmtp}
                      disabled={testingSmtp || !testEmailRecipient}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-800 dark:text-slate-200 disabled:opacity-50"
                    >
                      {testingSmtp ? 'Sending...' : 'Send Test Email'}
                    </button>
                  </div>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      smtpTestResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
                    }`}
                  >
                    {smtpTestResult.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingSmtp}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 mt-2"
                >
                  {savingSmtp ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}

          {/* SUBTAB 4.4: SECURITY */}
          {settingsSubTab === 'security' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <Lock className="w-6 h-6 text-purple-500" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Platform Security & Credentials Architecture
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configuration isolation, encryption at rest & self-hosted boundary
                  </p>
                </div>
              </div>

              {/* Security Rule 1: JWT In Environment */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    JWT Authentication Secret (Environment Variable)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <code className="text-purple-600 font-mono bg-purple-50 dark:bg-purple-950/60 px-1 py-0.5 rounded">JWT_SECRET</code> and <code className="text-purple-600 font-mono bg-purple-50 dark:bg-purple-950/60 px-1 py-0.5 rounded">JWT_EXPIRES_IN</code> are strictly managed in backend environment variables. In adherence to zero-trust security, they are never exposed in the Admin Panel or client bundle.
                </p>
              </div>

              {/* Security Rule 2: Database In Environment */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    MySQL Database Credentials (Environment Variable)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Database host, port, database name, user, and password (<code className="text-purple-600 font-mono bg-purple-50 dark:bg-purple-950/60 px-1 py-0.5 rounded">DB_HOST</code>, <code className="text-purple-600 font-mono bg-purple-50 dark:bg-purple-950/60 px-1 py-0.5 rounded">DB_USER</code>, <code className="text-purple-600 font-mono bg-purple-50 dark:bg-purple-950/60 px-1 py-0.5 rounded">DB_PASSWORD</code>) are kept in backend environment variables and are never accessible via frontend APIs.
                </p>
              </div>

              {/* Security Rule 3: Admin Encrypted Settings */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Encryption at Rest (AES-256-GCM)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Cloudflare R2 secret access key and SMTP password are authenticated and encrypted using AES-256-GCM before writing to MySQL. Plaintext secrets are never stored in the database or transmitted over public APIs.
                </p>
              </div>

              {/* Security Rule 4: Self-Hosted Calling & Zero Firebase */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Self-Hosted Infrastructure (No Firebase / Supabase)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  DevSphere uses our own Node.js + WebSocket server for WebRTC signaling and real-time private messaging. Normal calls use direct peer-to-peer media. Call audio/video is never recorded or stored automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admin Audit Log</h3>
            <button onClick={fetchLogs} className="text-xs text-sky-600 hover:underline">
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      Loading audit records...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No admin operations recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {log.admin?.full_name || log.admin?.username || `Admin #${log.admin_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {log.target_type} #{log.target_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
