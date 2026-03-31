import  LoginForm  from "@/src/components/personnal/formLogin"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-1 self-center font-medium">
          <div className="text-primary-foreground flex size-6 items-center justify-center rounded-md">
             <Image src="/logo.svg" alt="Tarna logo" width={24} height={24} />
          </div>
          Tarna
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
