'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import type { PublicAnalysisResult } from '@/types/public-analysis';
import { useToast } from '@/contexts/ToastContext';

interface LeadCaptureFormProps {
  result: PublicAnalysisResult;
}

export function LeadCaptureForm({ result }: LeadCaptureFormProps) {
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultDomain = useMemo(() => {
    try {
      const url = new URL(result.url.startsWith('http') ? result.url : `https://${result.url}`);
      return url.hostname;
    } catch {
      return result.url;
    }
  }, [result.url]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [domain, setDomain] = useState(defaultDomain);

  const canSubmit = email.trim().length > 3 && domain.trim().length > 3;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          domain: domain.trim(),
          analysis: {
            url: result.url,
            score: result.score,
            summary: result.summary,
            findings: result.findings.slice(0, 5),
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data?.error || 'Konnte Anfrage nicht senden. Bitte versuche es erneut.');
        return;
      }

      showSuccess('Danke! Wir melden uns mit einer kurzen Einschätzung bei dir.');
      setName('');
      setEmail('');
      setPhone('');
    } catch {
      showError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
          <ShieldCheck className="w-5 h-5 text-indigo-300" />
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-100">
            Kostenlose Experten-Einschätzung zu deinem Ergebnis
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Wir schauen uns dein Ergebnis an und melden uns mit den wichtigsten Quick Wins & Risiken.
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          icon={<User className="w-4 h-4" />}
          label="Name (optional)"
          value={name}
          onChange={setName}
          placeholder="Max Mustermann"
          type="text"
        />
        <Field
          icon={<Mail className="w-4 h-4" />}
          label="E-Mail"
          value={email}
          onChange={setEmail}
          placeholder="name@firma.de"
          type="email"
          required
        />
        <Field
          icon={<Phone className="w-4 h-4" />}
          label="Telefon (optional)"
          value={phone}
          onChange={setPhone}
          placeholder="+49 …"
          type="tel"
        />
        <Field
          icon={<ArrowRight className="w-4 h-4" />}
          label="Domain"
          value={domain}
          onChange={setDomain}
          placeholder="deine-domain.de"
          type="text"
          required
        />

        <div className="sm:col-span-2 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isSubmitting ? 'Wird gesendet…' : 'Ergebnis & Handlungsempfehlung erhalten'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-[11px] text-slate-500 mt-2 text-center">
            Mit Absenden akzeptierst du die Kontaktaufnahme zur Einordnung deines Ergebnisses.
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type,
  required,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-9 pr-3 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    </label>
  );
}

