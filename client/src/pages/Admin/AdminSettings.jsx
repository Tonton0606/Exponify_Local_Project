import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Label, Select, SelectItem, Switch, AIAssistant, Progress
} from "../../components/admin/ui";
import {
  Save, Settings, User, Building, Bell, Link, Brain, Sparkles, Zap,
  TrendingUp, CheckCircle, AlertTriangle, Lightbulb, Target, Shield
} from "lucide-react";
import { aiModules } from "../../services/ai";
import { supabase } from "../../config/supabaseClient";
import ChangePasswordForm from "../../components/auth/ChangePasswordForm";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [optimizationScore, setOptimizationScore] = useState(75);
  const [recommendations, setRecommendations] = useState([]);
  const [settingsData, setSettingsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const fetchSettingsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch current settings
      const [profileData, companyData, notificationData] = await Promise.all([
        fetchProfileSettings(),
        fetchCompanySettings(),
        fetchNotificationSettings()
      ]);

      setSettingsData({
        profile: profileData,
        company: companyData,
        notifications: notificationData
      });

      // Generate AI insights and recommendations
      const insights = await aiModules.analyzeSettings({
        profile: profileData,
        company: companyData,
        notifications: notificationData
      });
      setAiInsights(insights);
      setRecommendations(insights.recommendations || []);
      setOptimizationScore(insights.optimizationScore || 75);

    } catch (error) {
      console.error('Error fetching settings data:', error);
      // Use mock data for demo
      const mockData = generateMockSettings();
      setSettingsData(mockData);
      setRecommendations(generateMockRecommendations());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockSettings = () => ({
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@hermes.com',
      phone: '+1 (555) 123-4567',
      bio: 'Experienced technology professional'
    },
    company: {
      name: 'Hermes Technologies',
      industry: 'technology',
      size: '51-200',
      website: 'https://hermes.com'
    },
    notifications: {
      email: true,
      push: false,
      sms: true,
      marketing: false
    }
  });

  const generateMockRecommendations = () => [
    {
      id: 1,
      category: 'security',
      priority: 'high',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account with 2FA',
      impact: 'Increases account security by 99%',
      effort: 'low'
    },
    {
      id: 2,
      category: 'productivity',
      priority: 'medium',
      title: 'Optimize Notification Settings',
      description: 'Adjust notification preferences to reduce distractions',
      impact: 'Improves focus by 25%',
      effort: 'low'
    },
    {
      id: 3,
      category: 'integration',
      priority: 'medium',
      title: 'Connect Slack Integration',
      description: 'Integrate with Slack for better team collaboration',
      impact: 'Streamlines communication',
      effort: 'medium'
    }
  ];

  const fetchProfileSettings = async () => generateMockSettings().profile;
  const fetchCompanySettings = async () => generateMockSettings().company;
  const fetchNotificationSettings = async () => generateMockSettings().notifications;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Save settings to database
      await supabase.from('user_settings').upsert({
        user_id: 'current-user',
        settings: settingsData,
        updated_at: new Date().toISOString()
      });

      // Re-analyze settings after save
      const insights = await aiModules.analyzeSettings(settingsData);
      setAiInsights(insights);
      setRecommendations(insights.recommendations || []);
      setOptimizationScore(insights.optimizationScore || 75);

    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const runOptimizationAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const analysis = await aiModules.optimizeSettings({
        currentSettings: settingsData,
        userBehavior: generateUserBehaviorData(),
        bestPractices: getBestPractices()
      });

      setRecommendations(analysis.recommendations);
      setOptimizationScore(analysis.optimizedScore);
      setAiInsights(prev => ({
        ...prev,
        ...analysis
      }));

    } catch (error) {
      console.error('Error running optimization analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateUserBehaviorData = () => ({
    loginFrequency: 'daily',
    activeHours: ['9:00-17:00'],
    preferredCommunication: 'email',
    teamSize: 15,
    role: 'admin'
  });

  const getBestPractices = () => ({
    security: ['2fa_enabled', 'strong_password', 'regular_updates'],
    productivity: ['focused_notifications', 'email_batches', 'meeting_free_blocks'],
    collaboration: ['slack_integration', 'calendar_sync', 'document_sharing']
  });

  const applyRecommendation = async (recommendation) => {
    // Apply the recommended setting change
    const updatedSettings = { ...settingsData };
    
    switch (recommendation.category) {
      case 'security':
        updatedSettings.notifications = { ...updatedSettings.notifications, security: true };
        break;
      case 'productivity':
        updatedSettings.notifications = { ...updatedSettings.notifications, push: false, marketing: false };
        break;
      case 'integration':
        // Would open integration dialog
        break;
    }

    setSettingsData(updatedSettings);
    
    // Remove applied recommendation
    setRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-[var(--danger-soft)] text-[var(--danger)]',
      medium: 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]',
      low: 'bg-[var(--success-soft)] text-[var(--success)]'
    };
    return colors[priority] || 'bg-[var(--hover-bg)]';
  };

  const getOptimizationLevel = (score) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-[var(--success)]' };
    if (score >= 75) return { text: 'Good', color: 'text-[var(--brand-cyan)]' };
    if (score >= 60) return { text: 'Fair', color: 'text-[var(--brand-gold)]' };
    return { text: 'Needs Improvement', color: 'text-[var(--danger)]' };
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "company", label: "Company", icon: Building },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Link },
    { id: "security", label: "Security", icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI-Powered Settings</h1>
          <p className="text-[var(--text-secondary)]">Intelligent optimization and personalized recommendations</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            icon={Brain}
            onClick={runOptimizationAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'AI Optimization'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Optimization Score */}
      <Card className="bg-gradient-to-br from-[var(--brand-cyan-soft)] via-[var(--bg-card)] to-[var(--success-soft)] border border-[var(--brand-cyan-border)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[var(--brand-cyan-soft)] rounded-full flex items-center justify-center">
                <Target className="w-8 h-8 text-[var(--brand-cyan)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Settings Optimization</h3>
                <p className={`text-3xl font-bold ${getOptimizationLevel(optimizationScore).color}`}>
                  {optimizationScore}%
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {getOptimizationLevel(optimizationScore).text} Configuration
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-secondary)]">AI Recommendations</p>
              <p className="text-2xl font-bold text-[var(--brand-gold)]">{recommendations.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card className="bg-gradient-to-br from-[var(--brand-gold-soft)] via-[var(--bg-card)] to-[var(--brand-cyan-soft)] border border-[var(--brand-gold-border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--brand-gold)]" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.slice(0, 3).map(rec => (
                <div key={rec.id} className="border border-[var(--brand-gold-border)] rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">{rec.title}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{rec.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {rec.effort} effort
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">
                      <span className="font-medium">Impact:</span> {rec.impact}
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => applyRecommendation(rec)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-color)]">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-[var(--brand-cyan)] text-[var(--brand-cyan)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-color)]"
                }`}
              >
                <Icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[var(--brand-cyan)]" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={settingsData.profile?.firstName || ''}
                    onChange={e => setSettingsData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, firstName: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={settingsData.profile?.lastName || ''}
                    onChange={e => setSettingsData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, lastName: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={settingsData.profile?.email || ''}
                  onChange={e => setSettingsData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, email: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={settingsData.profile?.phone || ''}
                  onChange={e => setSettingsData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, phone: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="w-full p-2 border border-[var(--border-color)] rounded-xl"
                  rows={4}
                  value={settingsData.profile?.bio || ''}
                  onChange={e => setSettingsData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, bio: e.target.value }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "company" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[var(--brand-gold)]" />
                Company Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName" 
                  value={settingsData.company?.name || ''}
                  onChange={e => setSettingsData(prev => ({
                    ...prev,
                    company: { ...prev.company, name: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={settingsData.company?.industry || ''}>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </Select>
              </div>
              <div>
                <Label htmlFor="size">Company Size</Label>
                <Select value={settingsData.company?.size || ''}>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201+">201+ employees</SelectItem>
                </Select>
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  type="url" 
                  value={settingsData.company?.website || ''}
                  onChange={e => setSettingsData(prev => ({
                    ...prev,
                    company: { ...prev.company, website: e.target.value }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[var(--success)]" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-[var(--text-secondary)]">Receive email updates about your account</p>
                </div>
                <Switch 
                  checked={settingsData.notifications?.email || false}
                  onCheckedChange={checked => setSettingsData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: checked }
                  }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-[var(--text-secondary)]">Receive push notifications in your browser</p>
                </div>
                <Switch 
                  checked={settingsData.notifications?.push || false}
                  onCheckedChange={checked => setSettingsData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, push: checked }
                  }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-[var(--text-secondary)]">Receive text messages for important updates</p>
                </div>
                <Switch 
                  checked={settingsData.notifications?.sms || false}
                  onCheckedChange={checked => setSettingsData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, sms: checked }
                  }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-[var(--text-secondary)]">Receive emails about new features and updates</p>
                </div>
                <Switch 
                  checked={settingsData.notifications?.marketing || false}
                  onCheckedChange={checked => setSettingsData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, marketing: checked }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "security" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[var(--accent-gold)]" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <ChangePasswordForm />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Password Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  {[
                    "Minimum 12 characters",
                    "Must include uppercase and lowercase letters",
                    "Must include at least one number",
                    "Must include at least one special character",
                    "Cannot contain common passwords (admin, password, 123456…)",
                  ].map((rule, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "integrations" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-[var(--accent-gold)]" />
                Third-Party Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[var(--border-color)] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Slack</h4>
                    <Badge className="bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">Recommended</Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">Connect your workspace for team collaboration</p>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
                <div className="border border-[var(--border-color)] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Google Calendar</h4>
                    <Badge className="bg-[var(--success-soft)] text-[var(--success)]">Popular</Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">Sync your calendar for better scheduling</p>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Settings Intelligence */}
      <Card className="bg-gradient-to-br from-[var(--brand-cyan-soft)] via-[var(--bg-card)] to-[var(--success-soft)] border border-[var(--brand-cyan-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--brand-cyan)]" />
            AI Settings Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand-cyan)]" />
                Optimization Insights
              </h4>
              <div className="space-y-2">
                {aiInsights?.insights?.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{insight}</p>
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">Analyzing settings patterns...</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                Usage Patterns
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-[var(--bg-card)] rounded-2xl">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Peak Activity</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{aiInsights?.patterns?.peakTime || '9:00-11:00 AM'}</p>
                </div>
                <div className="p-3 bg-[var(--bg-card)] rounded-2xl">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Preferred Features</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{aiInsights?.patterns?.topFeatures || 'Dashboard, Reports'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--brand-gold)]" />
                AI Suggestions
              </h4>
              <div className="space-y-2">
                {aiInsights?.suggestions?.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-[var(--brand-gold)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{suggestion}</p>
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">Generating personalized suggestions...</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant */}
      <AIAssistant 
        context="settings"
        data={{ settingsData, recommendations, optimizationScore, aiInsights }}
      />
    </div>
  );
}
