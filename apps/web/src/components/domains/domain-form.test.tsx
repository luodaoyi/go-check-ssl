import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DomainForm } from "@/components/domains/domain-form";
import { I18nProvider } from "@/lib/i18n";

describe("DomainForm", () => {
  it("shows validation messages for invalid input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <DomainForm submitLabel="Add domain" onSubmit={onSubmit} />
      </I18nProvider>
    );

    await user.clear(screen.getByLabelText(/hostname/i));
    await user.clear(screen.getByLabelText(/port/i));
    await user.type(screen.getByLabelText(/port/i), "0");
    await user.click(screen.getByRole("button", { name: /add domain/i }));

    expect(await screen.findByText(/hostname is required/i)).toBeInTheDocument();
  });

  it("prefers a custom interval value over the preset cadence", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <DomainForm submitLabel="Add domain" onSubmit={onSubmit} />
      </I18nProvider>
    );

    await user.type(screen.getByLabelText(/hostname/i), "example.com");
    await user.clear(screen.getByLabelText(/custom interval/i));
    await user.type(screen.getByLabelText(/custom interval/i), "7200");
    await user.click(screen.getByRole("button", { name: /add domain/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      hostname: "example.com",
      check_interval_seconds: 7200,
    }));
  });
});
