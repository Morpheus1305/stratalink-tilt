import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, Edit, Mail, Webhook, Clock, AlertTriangle, CheckCircle, XCircle, History, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  symbol: string | null;
  triggerType: string;
  severityThreshold: string;
  regimeThreshold: string | null;
  poliThreshold: number | null;
  depthDivergenceThreshold: number | null;
  notifyEmail: boolean;
  emailRecipients: string[] | null;
  notifyWebhook: boolean;
  webhookUrl: string | null;
  cooldownMinutes: number;
  lastTriggered: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AlertHistoryEntry {
  id: number;
  ruleId: string;
  symbol: string;
  triggerType: string;
  severity: string;
  regime: string;
  signalData: object;
  emailSent: boolean;
  webhookSent: boolean;
  notificationStatus: string;
  triggeredAt: string;
}

const TRIGGER_TYPES = [
  { value: "DIVERGENCE", label: "Cross-Venue Divergence", description: "Alert when venues show divergent liquidity conditions" },
  { value: "REGIME_CHANGE", label: "Regime Change", description: "Alert when regime escalates past threshold" },
  { value: "POLI_DROP", label: "PoLi Drop", description: "Alert when PoLi score falls below threshold" },
  { value: "DEPTH_DROP", label: "Depth Divergence", description: "Alert when depth divergence exceeds threshold" },
];

const SEVERITY_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
const REGIME_LEVELS = ["NORMAL", "EARLY_WARNING", "STRESS_BUILDING", "CONFIRMED_STRESS"];

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL": return "text-red-500";
    case "HIGH": return "text-orange-500";
    case "MODERATE": return "text-yellow-500";
    case "LOW": return "text-green-500";
    default: return "text-muted-foreground";
  }
}

function getRegimeBadgeVariant(regime: string): "default" | "secondary" | "destructive" | "outline" {
  switch (regime) {
    case "CONFIRMED_STRESS": return "destructive";
    case "STRESS_BUILDING": return "destructive";
    case "EARLY_WARNING": return "secondary";
    default: return "outline";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "SENT": return "text-green-500";
    case "PARTIAL": return "text-yellow-500";
    case "FAILED": return "text-red-500";
    case "SKIPPED": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
}

export default function AlertConfigPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    triggerType: "DIVERGENCE",
    severityThreshold: "HIGH",
    regimeThreshold: "",
    poliThreshold: "",
    depthDivergenceThreshold: "",
    symbol: "",
    notifyEmail: false,
    emailRecipients: "",
    notifyWebhook: false,
    webhookUrl: "",
    cooldownMinutes: "15",
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<AlertRule[]>({
    queryKey: ["/api/alerts/rules"],
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<AlertHistoryEntry[]>({
    queryKey: ["/api/alerts/history"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: object) => {
      const response = await apiRequest("POST", "/api/alerts/rules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Alert rule created", description: "Your alert rule has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create rule", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const response = await apiRequest("PATCH", `/api/alerts/rules/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      setEditingRule(null);
      resetForm();
      toast({ title: "Alert rule updated", description: "Your alert rule has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update rule", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/alerts/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({ title: "Alert rule deleted", description: "Your alert rule has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete rule", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await apiRequest("PATCH", `/api/alerts/rules/${id}`, { enabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
    },
  });

  function resetForm() {
    setFormData({
      name: "",
      triggerType: "DIVERGENCE",
      severityThreshold: "HIGH",
      regimeThreshold: "",
      poliThreshold: "",
      depthDivergenceThreshold: "",
      symbol: "",
      notifyEmail: false,
      emailRecipients: "",
      notifyWebhook: false,
      webhookUrl: "",
      cooldownMinutes: "15",
    });
  }

  function openEditDialog(rule: AlertRule) {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      triggerType: rule.triggerType,
      severityThreshold: rule.severityThreshold,
      regimeThreshold: rule.regimeThreshold || "",
      poliThreshold: rule.poliThreshold?.toString() || "",
      depthDivergenceThreshold: rule.depthDivergenceThreshold?.toString() || "",
      symbol: rule.symbol || "",
      notifyEmail: rule.notifyEmail,
      emailRecipients: rule.emailRecipients?.join(", ") || "",
      notifyWebhook: rule.notifyWebhook,
      webhookUrl: rule.webhookUrl || "",
      cooldownMinutes: rule.cooldownMinutes.toString(),
    });
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      name: formData.name,
      triggerType: formData.triggerType,
      severityThreshold: formData.severityThreshold,
      notifyEmail: formData.notifyEmail,
      notifyWebhook: formData.notifyWebhook,
      cooldownMinutes: parseInt(formData.cooldownMinutes) || 15,
    };

    if (formData.symbol) payload.symbol = formData.symbol.toUpperCase();
    if (formData.regimeThreshold) payload.regimeThreshold = formData.regimeThreshold;
    if (formData.poliThreshold) payload.poliThreshold = parseInt(formData.poliThreshold);
    if (formData.depthDivergenceThreshold) payload.depthDivergenceThreshold = parseFloat(formData.depthDivergenceThreshold);
    if (formData.notifyEmail && formData.emailRecipients) {
      payload.emailRecipients = formData.emailRecipients.split(",").map(e => e.trim()).filter(Boolean);
    }
    if (formData.notifyWebhook && formData.webhookUrl) {
      payload.webhookUrl = formData.webhookUrl;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/lis">
              <Button variant="ghost" size="icon" data-testid="button-back-lis">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" />
                Stress Alert Configuration
              </h1>
              <p className="text-muted-foreground">Configure customizable alerts for cross-venue stress signals</p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-alert">
                <Plus className="h-4 w-4 mr-2" />
                Create Alert Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Alert Rule</DialogTitle>
                <DialogDescription>Configure a new stress signal alert with custom thresholds and notifications.</DialogDescription>
              </DialogHeader>
              <AlertRuleForm 
                formData={formData} 
                setFormData={setFormData} 
                onSubmit={handleSubmit}
                isPending={createMutation.isPending}
                submitLabel="Create Rule"
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules" data-testid="tab-rules">
              <Bell className="h-4 w-4 mr-2" />
              Alert Rules ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              Alert History ({history.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            {rulesLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">Loading alert rules...</CardContent>
              </Card>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No alert rules configured</p>
                  <p className="text-muted-foreground mb-4">Create your first alert rule to monitor stress signals.</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-alert">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rules.map((rule) => (
                  <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(enabled) => toggleMutation.mutate({ id: rule.id, enabled })}
                            data-testid={`switch-toggle-${rule.id}`}
                          />
                          <div>
                            <CardTitle className="text-lg">{rule.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{rule.triggerType}</Badge>
                              <span className={getSeverityColor(rule.severityThreshold)}>
                                {rule.severityThreshold}+ severity
                              </span>
                              {rule.symbol && <Badge variant="secondary">{rule.symbol}</Badge>}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)} data-testid={`button-edit-${rule.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(rule.id)} data-testid={`button-delete-${rule.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className={`h-4 w-4 ${rule.notifyEmail ? "text-primary" : "text-muted-foreground"}`} />
                          <span>{rule.notifyEmail ? "Email enabled" : "Email disabled"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Webhook className={`h-4 w-4 ${rule.notifyWebhook ? "text-primary" : "text-muted-foreground"}`} />
                          <span>{rule.notifyWebhook ? "Webhook enabled" : "Webhook disabled"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{rule.cooldownMinutes}min cooldown</span>
                        </div>
                        <div className="text-muted-foreground">
                          {rule.lastTriggered 
                            ? `Last: ${new Date(rule.lastTriggered).toLocaleString()}`
                            : "Never triggered"
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">Loading alert history...</CardContent>
              </Card>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No alerts triggered yet</p>
                  <p className="text-muted-foreground">Alert history will appear here when rules are triggered.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Time</th>
                          <th className="text-left p-3 font-medium">Symbol</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">Severity</th>
                          <th className="text-left p-3 font-medium">Regime</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Notifications</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((entry) => (
                          <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                            <td className="p-3 font-mono text-sm">
                              {new Date(entry.triggeredAt).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">{entry.symbol}</Badge>
                            </td>
                            <td className="p-3">{entry.triggerType}</td>
                            <td className={`p-3 ${getSeverityColor(entry.severity)}`}>
                              {entry.severity}
                            </td>
                            <td className="p-3">
                              <Badge variant={getRegimeBadgeVariant(entry.regime)}>{entry.regime}</Badge>
                            </td>
                            <td className={`p-3 ${getStatusColor(entry.notificationStatus)}`}>
                              {entry.notificationStatus === "SENT" && <CheckCircle className="h-4 w-4 inline mr-1" />}
                              {entry.notificationStatus === "FAILED" && <XCircle className="h-4 w-4 inline mr-1" />}
                              {entry.notificationStatus === "SKIPPED" && <AlertTriangle className="h-4 w-4 inline mr-1" />}
                              {entry.notificationStatus}
                            </td>
                            <td className="p-3 space-x-2">
                              {entry.emailSent && <Badge variant="outline">Email</Badge>}
                              {entry.webhookSent && <Badge variant="outline">Webhook</Badge>}
                              {!entry.emailSent && !entry.webhookSent && <span className="text-muted-foreground">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Alert Rule</DialogTitle>
              <DialogDescription>Update your alert rule configuration.</DialogDescription>
            </DialogHeader>
            <AlertRuleForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleSubmit}
              isPending={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  triggerType: string;
  severityThreshold: string;
  regimeThreshold: string;
  poliThreshold: string;
  depthDivergenceThreshold: string;
  symbol: string;
  notifyEmail: boolean;
  emailRecipients: string;
  notifyWebhook: boolean;
  webhookUrl: string;
  cooldownMinutes: string;
}

interface AlertRuleFormProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}

function AlertRuleForm({ formData, setFormData, onSubmit, isPending, submitLabel }: AlertRuleFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          placeholder="e.g., High Severity BTC Alert"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          data-testid="input-rule-name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Trigger Type</Label>
          <Select value={formData.triggerType} onValueChange={(value) => setFormData({ ...formData, triggerType: value })}>
            <SelectTrigger data-testid="select-trigger-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Severity Threshold</Label>
          <Select value={formData.severityThreshold} onValueChange={(value) => setFormData({ ...formData, severityThreshold: value })}>
            <SelectTrigger data-testid="select-severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}+
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="symbol">Symbol (optional)</Label>
        <Input
          id="symbol"
          placeholder="Leave blank for all symbols, or enter BTC, ETH, etc."
          value={formData.symbol}
          onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
          data-testid="input-symbol"
        />
      </div>

      {formData.triggerType === "REGIME_CHANGE" && (
        <div className="space-y-2">
          <Label>Regime Threshold</Label>
          <Select value={formData.regimeThreshold} onValueChange={(value) => setFormData({ ...formData, regimeThreshold: value })}>
            <SelectTrigger data-testid="select-regime">
              <SelectValue placeholder="Select regime level" />
            </SelectTrigger>
            <SelectContent>
              {REGIME_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.triggerType === "POLI_DROP" && (
        <div className="space-y-2">
          <Label htmlFor="poliThreshold">PoLi Threshold (0-100)</Label>
          <Input
            id="poliThreshold"
            type="number"
            min="0"
            max="100"
            placeholder="e.g., 50"
            value={formData.poliThreshold}
            onChange={(e) => setFormData({ ...formData, poliThreshold: e.target.value })}
            data-testid="input-poli-threshold"
          />
        </div>
      )}

      {formData.triggerType === "DEPTH_DROP" && (
        <div className="space-y-2">
          <Label htmlFor="depthThreshold">Depth Divergence % Threshold</Label>
          <Input
            id="depthThreshold"
            type="number"
            min="0"
            max="100"
            placeholder="e.g., 30"
            value={formData.depthDivergenceThreshold}
            onChange={(e) => setFormData({ ...formData, depthDivergenceThreshold: e.target.value })}
            data-testid="input-depth-threshold"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cooldown">Cooldown (minutes)</Label>
        <Input
          id="cooldown"
          type="number"
          min="1"
          max="1440"
          placeholder="15"
          value={formData.cooldownMinutes}
          onChange={(e) => setFormData({ ...formData, cooldownMinutes: e.target.value })}
          data-testid="input-cooldown"
        />
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">Notifications</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <Label htmlFor="notifyEmail">Email Notifications</Label>
            </div>
            <Switch
              id="notifyEmail"
              checked={formData.notifyEmail}
              onCheckedChange={(checked) => setFormData({ ...formData, notifyEmail: checked })}
              data-testid="switch-email"
            />
          </div>
          
          {formData.notifyEmail && (
            <div className="pl-6 space-y-2">
              <Label htmlFor="emailRecipients">Email Recipients (comma-separated)</Label>
              <Input
                id="emailRecipients"
                placeholder="alert@example.com, team@example.com"
                value={formData.emailRecipients}
                onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })}
                data-testid="input-email-recipients"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              <Label htmlFor="notifyWebhook">Webhook Notifications</Label>
            </div>
            <Switch
              id="notifyWebhook"
              checked={formData.notifyWebhook}
              onCheckedChange={(checked) => setFormData({ ...formData, notifyWebhook: checked })}
              data-testid="switch-webhook"
            />
          </div>
          
          {formData.notifyWebhook && (
            <div className="pl-6 space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://example.com/webhook"
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                data-testid="input-webhook-url"
              />
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button 
          onClick={onSubmit} 
          disabled={isPending || !formData.name}
          data-testid="button-submit-rule"
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
