'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartBar, SignIn } from '@phosphor-icons/react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin');
        router.refresh();
      } else {
        setError('שם משתמש או סיסמה שגויים');
      }
    } catch {
      setError('שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center mx-auto mb-4">
            <ChartBar weight="fill" className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold">כניסה לניהול</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">הזן את פרטי ההתחברות</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">שם משתמש</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                'מתחבר...'
              ) : (
                <>
                  <SignIn weight="bold" className="w-4 h-4" />
                  <span>התחבר</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
