import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/* Landing-page "Demo so'rash" form submissions — appended to a local JSON
 * file. Works for local dev / a traditional long-running Node server.
 *
 * IMPORTANT: on Vercel (or any serverless host) the filesystem is
 * ephemeral per invocation — writes here will NOT persist reliably in
 * that kind of production deployment. If this app is deployed to Vercel,
 * swap this for a real destination (a database table, a Telegram bot
 * message, an email, etc.) before relying on it for real leads. */

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "demo-requests.json");

interface DemoRequest {
  id: string;
  name: string;
  phone: string;
  crm: string;
  createdAt: string;
}

async function readAll(): Promise<DemoRequest[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as DemoRequest[];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; phone?: string; crm?: string }
    | null;

  const name = body?.name?.trim();
  const phone = body?.phone?.trim();
  const crm = body?.crm?.trim();

  if (!name || !phone || !crm) {
    return NextResponse.json({ success: false, error: "name, phone, crm majburiy" }, { status: 400 });
  }

  const entry: DemoRequest = {
    id: crypto.randomUUID(),
    name,
    phone,
    crm,
    createdAt: new Date().toISOString(),
  };

  await mkdir(DATA_DIR, { recursive: true });
  const all = await readAll();
  all.push(entry);
  await writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");

  return NextResponse.json({ success: true });
}

export async function GET() {
  const all = await readAll();
  return NextResponse.json({ success: true, data: all });
}
