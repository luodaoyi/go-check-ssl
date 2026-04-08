import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EndpointForm } from "@/components/notifications/endpoint-form";
import { I18nProvider } from "@/lib/i18n";

describe("EndpointForm", () => {
  it("submits the webhook payload shape", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <EndpointForm submitLabel="Save endpoint" onSubmit={onSubmit} />
      </I18nProvider>
    );

    await user.type(screen.getByLabelText(/name/i), "Webhook");
    await user.selectOptions(screen.getByLabelText(/type/i), "webhook");
    await user.type(screen.getByLabelText(/webhook url/i), "https://example.com/webhook");
    await user.click(screen.getByRole("button", { name: /save endpoint/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Webhook",
      type: "webhook",
      enabled: true,
      config: { url: "https://example.com/webhook" },
    });
  });

  it("submits telegram bot token and chat id", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <EndpointForm submitLabel="Save endpoint" onSubmit={onSubmit} />
      </I18nProvider>
    );

    await user.type(screen.getByLabelText(/name/i), "Telegram");
    await user.selectOptions(screen.getByLabelText(/type/i), "telegram");
    await user.type(screen.getByLabelText(/telegram bot token/i), "123456:tenant-bot");
    await user.type(screen.getByLabelText(/telegram chat id/i), "998877");
    await user.click(screen.getByRole("button", { name: /save endpoint/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Telegram",
      type: "telegram",
      enabled: true,
      config: {
        bot_token: "123456:tenant-bot",
        chat_id: "998877",
      },
    });
  });
});
