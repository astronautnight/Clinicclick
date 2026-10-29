
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            console.error("RESEND_API_KEY is not configured.");
            return NextResponse.json(
                { error: "Email service is not configured." },
                { status: 500 }
            );
        }

        const resend = new Resend(apiKey);

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
    } catch (error) {
        console.error("Test email failed:", error);
        return NextResponse.json(
            { error: "Failed to send test email." },
            { status: 500 }
        );
    }
}
