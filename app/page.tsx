import Link from "next/link"
import { ArrowRight, BarChart3, CheckCircle, ReplaceIcon as Customize, QrCode, Shield, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            <span className="text-xl font-bold">EasyAccessQR</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium transition-colors hover:text-primary">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium transition-colors hover:text-primary">
              Pricing
            </Link>
            <Link href="#testimonials" className="text-sm font-medium transition-colors hover:text-primary">
              Testimonials
            </Link>
            <Link href="#faq" className="text-sm font-medium transition-colors hover:text-primary">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium transition-colors hover:text-primary">
              Login
            </Link>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    Create Custom QR Codes with Powerful Analytics
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Generate beautiful, customized QR codes and track their performance with our comprehensive analytics
                    dashboard.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">
                      Start Creating QR Codes <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#demo">See Demo</Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-[500px] aspect-square">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg opacity-20 blur-xl"></div>
                  <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 flex items-center justify-center">
                    <QrCode className="w-3/4 h-3/4 text-primary" strokeWidth={1} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Powerful QR Code Features
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to create, customize, and track your QR codes in one place.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
              <Card>
                <CardHeader>
                  <Customize className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Custom Design</CardTitle>
                  <CardDescription>
                    Personalize your QR codes with colors, logos, and shapes to match your brand.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <BarChart3 className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Detailed Analytics</CardTitle>
                  <CardDescription>
                    Track scans, locations, devices, and more with our comprehensive dashboard.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Zap className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Instant Generation</CardTitle>
                  <CardDescription>Create QR codes in seconds with our intuitive and fast interface.</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Secure & Reliable</CardTitle>
                  <CardDescription>
                    Your QR codes are always available and protected with our secure infrastructure.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <ArrowRight className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Dynamic QR Codes</CardTitle>
                  <CardDescription>Update your QR code destination without changing the code itself.</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Bulk Creation</CardTitle>
                  <CardDescription>
                    Generate multiple QR codes at once for campaigns or large-scale projects.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section id="demo" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  See EasyAccessQR in Action
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Watch how easy it is to create custom QR codes and track their performance.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-5xl mt-12">
              <div className="overflow-hidden rounded-lg border bg-background shadow">
                <div className="aspect-video w-full bg-muted flex items-center justify-center">
                  <img
                    src="/placeholder.svg?height=720&width=1280"
                    alt="EasyAccessQR Dashboard Demo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="analytics" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex items-center justify-center">
                <div className="overflow-hidden rounded-lg border bg-background shadow">
                  <div className="aspect-video w-full bg-muted flex items-center justify-center">
                    <img
                      src="/placeholder.svg?height=720&width=1280"
                      alt="Analytics Dashboard"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Powerful Analytics Dashboard
                  </h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Gain valuable insights into how your QR codes are performing with our comprehensive analytics tools.
                  </p>
                </div>
                <ul className="grid gap-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>Track total scans and unique visitors</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>View geographic data and location insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>Analyze device and browser information</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>Monitor scan trends over time</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>Export data for further analysis</span>
                  </li>
                </ul>
                <div>
                  <Button size="lg" asChild>
                    <Link href="/signup">Try Analytics Now</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Simple, Transparent Pricing
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Choose the plan that works best for your needs.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-12">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Basic</CardTitle>
                  <div className="text-4xl font-bold">
                    $9<span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>Perfect for individuals and small projects.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="grid gap-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Up to 50 QR codes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Basic customization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Basic analytics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Email support</span>
                    </li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full" asChild>
                    <Link href="/signup?plan=basic">Get Started</Link>
                  </Button>
                </div>
              </Card>
              <Card className="flex flex-col border-primary">
                <CardHeader>
                  <div className="text-center text-sm font-medium text-primary mb-2">MOST POPULAR</div>
                  <CardTitle>Professional</CardTitle>
                  <div className="text-4xl font-bold">
                    $29<span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>Ideal for businesses and marketing teams.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="grid gap-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Up to 500 QR codes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Advanced customization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Full analytics dashboard</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Priority email support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Team collaboration</span>
                    </li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full" asChild>
                    <Link href="/signup?plan=professional">Get Started</Link>
                  </Button>
                </div>
              </Card>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <div className="text-4xl font-bold">
                    $99<span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>For large organizations with advanced needs.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="grid gap-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Unlimited QR codes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Premium customization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Advanced analytics & reporting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Dedicated account manager</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>API access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>White-labeling options</span>
                    </li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full" asChild>
                    <Link href="/signup?plan=enterprise">Get Started</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">What Our Customers Say</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Trusted by businesses of all sizes around the world.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-12">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-muted p-2">
                      <img
                        src="/placeholder.svg?height=100&width=100"
                        alt="Sarah Johnson"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">Sarah Johnson</p>
                      <p className="text-sm text-muted-foreground">Marketing Director, TechCorp</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-muted-foreground">
                      "EasyAccessQR has transformed our marketing campaigns. The analytics provide invaluable insights,
                      and the custom designs match our brand perfectly."
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-muted p-2">
                      <img
                        src="/placeholder.svg?height=100&width=100"
                        alt="Michael Chen"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">Michael Chen</p>
                      <p className="text-sm text-muted-foreground">Small Business Owner</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-muted-foreground">
                      "As a small business owner, I needed an affordable solution that still looked professional.
                      EasyAccessQR delivers exactly that, plus the analytics help me understand my customers better."
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-muted p-2">
                      <img
                        src="/placeholder.svg?height=100&width=100"
                        alt="Emily Rodriguez"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">Emily Rodriguez</p>
                      <p className="text-sm text-muted-foreground">Event Coordinator, EventPro</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-muted-foreground">
                      "We use EasyAccessQR for all our events now. Being able to track when and where people scan our
                      codes has helped us optimize our event layouts and marketing materials."
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="faq" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Frequently Asked Questions
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Find answers to common questions about EasyAccessQR.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-3xl space-y-4 mt-12">
              <Card>
                <CardHeader>
                  <CardTitle>How do QR code analytics work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Our system generates a unique tracking URL for each QR code. When someone scans the code, they're
                    directed through our secure servers (which record anonymous data like location, device type, and
                    time) before being seamlessly redirected to your destination URL.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Can I update my QR code after creating it?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Yes! With our dynamic QR codes, you can change the destination URL anytime without needing to
                    reprint or redistribute your QR code. This is perfect for campaigns, menus, or any situation where
                    the content might need updating.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Are there limits to how many scans my QR codes can receive?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    No, there are no scan limits on any of our plans. Your QR codes can be scanned as many times as
                    needed. The only limits are on the number of unique QR codes you can create, which varies by plan.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>How customizable are the QR codes?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Our QR codes are highly customizable. You can change colors, add your logo, adjust the shape of the
                    code elements, and choose from various patterns. All codes are tested to ensure they remain
                    scannable despite customizations.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Can I export my analytics data?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Yes, all plans include the ability to export your analytics data in CSV format. Professional and
                    Enterprise plans also support PDF reports and API access for integrating with your existing
                    analytics tools.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to Get Started?</h2>
                <p className="max-w-[900px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Create your first custom QR code in minutes and start tracking its performance.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/signup">
                    Create Your First QR Code <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            <p className="text-sm text-muted-foreground">© 2025 EasyAccessQR. All rights reserved.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
              Privacy
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
