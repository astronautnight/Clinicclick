
import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
    try {
        const { data, error } = await resend.emails.send({
            from: "Clinic@Click <hello@mail.clinicatclick.com>",
            to: ["clinicatclick@gmail.com"],
            subject: "Clinic@Click email test",
            html: `
        <h2>Email setup successful</h2>
        <p>Clinic@Click can now send emails through Resend.</p>
        <p><a href="https://clinicatclick.com">Open Clinic@Click</a></p>
      `,
        });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, id: data?.id });
    } catch {
        return NextResponse.json(
            { error: "Failed to send test email." },
            { status: 500 }
        );
    }
}
