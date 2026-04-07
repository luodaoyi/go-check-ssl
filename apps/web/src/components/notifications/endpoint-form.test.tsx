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
});
