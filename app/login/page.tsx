'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/bglogin.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-3 mb-2">
            <img src="https://i.ibb.co/4wdW4yvd/ICP-ladda-logo-01-Copy.png" alt="ICP Ladda Logo" style={{ width: '150px', height: 'auto' }} />
            <CardTitle className="text-2xl font-bold text-icp-black">PO Approval System</CardTitle>
          </div>
          <p className="text-icp-grey mt-2">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-icp-danger-light text-icp-danger p-3 rounded-lg text-sm">
              {error === 'access_denied'
                ? 'การเข้าสู่ระบบถูกปฏิเสธ'
                : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'}
            </div>
          )}
          <Button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-icp-primary hover:bg-icp-primary-dark"
            size="lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
