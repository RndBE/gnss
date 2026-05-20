"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { KeyRoundIcon, Loader2Icon, SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PasswordResponse = {
  error?: string
  message?: string
}

export function PasswordSettingsForm() {
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    const response = await fetch("/api/users/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    })
    const payload = (await response.json().catch(() => ({}))) as PasswordResponse
    setSaving(false)

    if (!response.ok) {
      setError(payload.error ?? "Gagal mengganti password.")
      return
    }

    setMessage(payload.message ?? "Password berhasil diperbarui.")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <Card className="interactive-card border-sky-100 bg-gradient-to-br from-card via-card to-sky-50/45">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="interactive-tile flex size-10 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
            <KeyRoundIcon className="interactive-icon size-4" />
          </div>
          <div>
            <CardTitle>Ganti Password</CardTitle>
            <CardDescription>
              Gunakan email akun, password lama, dan password baru minimal 8 karakter.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submitPassword}>
          <div className="grid gap-2">
            <Label htmlFor="password-email">Email akun</Label>
            <Input
              autoComplete="email"
              id="password-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@gnss.local"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="current-password">Password lama</Label>
            <Input
              autoComplete="current-password"
              id="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="new-password">Password baru</Label>
              <Input
                autoComplete="new-password"
                id="new-password"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Konfirmasi password</Label>
              <Input
                autoComplete="new-password"
                id="confirm-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </div>
          </div>
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}
          <Button className="w-fit" disabled={saving} type="submit">
            {saving ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
            {saving ? "Menyimpan" : "Simpan Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
