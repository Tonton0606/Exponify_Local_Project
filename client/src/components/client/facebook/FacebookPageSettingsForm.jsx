import { useEffect, useState } from "react";

const DEFAULT_SETTINGS = {
  pageName: "",
  businessType: "",
  businessDescription: "",
  productsServices: "",
  productServicePriceRanges: "",
  websiteLink: "",
  bookingLink: "",
  shoppeLink: "",
  lazadaLink: "",
  fallbackMode: "booking_and_handoff",
  aiEnabled: true,
  faqEnabled: true,
  suggestionsEnabled: true,
  humanHandoffEnabled: true,
  ownerNotificationEnabled: true,
  aiInstruction: "",
};

export default function FacebookPageSettingsForm({
  settings = null,
  selectedPage = null,
  loading = false,
  saving = false,
  onSave,
}) {
  const [form, setForm] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setForm({
      ...DEFAULT_SETTINGS,
      pageName:
        settings?.pageName ||
        selectedPage?.pageName ||
        DEFAULT_SETTINGS.pageName,
      businessType: settings?.businessType || "",
      businessDescription: settings?.businessDescription || "",
      productsServices: settings?.productsServices || "",
      productServicePriceRanges: settings?.productServicePriceRanges || "",
      websiteLink: settings?.websiteLink || "",
      bookingLink: settings?.bookingLink || "",
      shoppeLink: settings?.shoppeLink || "",
      lazadaLink: settings?.lazadaLink || "",
      fallbackMode: settings?.fallbackMode || "booking_and_handoff",
      aiEnabled: settings?.aiEnabled !== false,
      faqEnabled: settings?.faqEnabled !== false,
      suggestionsEnabled: settings?.suggestionsEnabled !== false,
      humanHandoffEnabled: settings?.humanHandoffEnabled !== false,
      ownerNotificationEnabled: settings?.ownerNotificationEnabled !== false,
      aiInstruction: settings?.aiInstruction || settings?.ai_instruction || "",
    });
  }, [settings, selectedPage]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.(form);
  };

  return (
    <form className="facebook-connect-panel" onSubmit={handleSubmit}>
      <div className="facebook-connect-panel-header">
        <div>
          <h2 className="facebook-connect-panel-title">
            Page Knowledge & AI Settings
          </h2>
          <p className="facebook-connect-panel-description">
            This controls how the AI answers questions when no approved FAQ matches.
          </p>
        </div>

        <button
          type="submit"
          className="facebook-connect-button facebook-connect-button-primary"
          disabled={loading || saving || !selectedPage?.pageId}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {!selectedPage?.pageId && (
        <div className="facebook-connect-empty">
          Select or connect a Facebook Page first.
        </div>
      )}

      {selectedPage?.pageId && (
        <div className="facebook-connect-form-grid">
          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Page Name</span>
            <input
              className="facebook-connect-input"
              value={form.pageName}
              onChange={(event) => updateField("pageName", event.target.value)}
              placeholder="Facebook Page"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Business Type</span>
            <input
              className="facebook-connect-input"
              value={form.businessType}
              onChange={(event) =>
                updateField("businessType", event.target.value)
              }
              placeholder="Restaurant, Retail, Tech Company..."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Business Description</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.businessDescription}
              onChange={(event) =>
                updateField("businessDescription", event.target.value)
              }
              placeholder="Describe what this business does, who it serves, and what customers usually ask about."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">
              AI Custom Instructions (Tone / Rules / Personality)
            </span>
            <textarea
              className="facebook-connect-textarea"
              value={form.aiInstruction}
              onChange={(event) =>
                updateField("aiInstruction", event.target.value)
              }
              placeholder="e.g. Speak Taglish only, use happy emojis, be a witty seller, refer to clients as suki"
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Products & Services</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.productsServices}
              onChange={(event) =>
                updateField("productsServices", event.target.value)
              }
              placeholder="List products, services, packages, or solutions offered by this page."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Pricing / Price Ranges</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.productServicePriceRanges}
              onChange={(event) =>
                updateField("productServicePriceRanges", event.target.value)
              }
              placeholder="Only add approved pricing. Leave blank if pricing should go to consultation."
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Website Link</span>
            <input
              className="facebook-connect-input"
              value={form.websiteLink}
              onChange={(event) =>
                updateField("websiteLink", event.target.value)
              }
              placeholder="https://example.com"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Booking / Meeting Link</span>
            <input
              className="facebook-connect-input"
              value={form.bookingLink}
              onChange={(event) =>
                updateField("bookingLink", event.target.value)
              }
              placeholder="https://example.com/book"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Shopee Link</span>
            <input
              className="facebook-connect-input"
              value={form.shoppeLink}
              onChange={(event) =>
                updateField("shoppeLink", event.target.value)
              }
              placeholder="Optional"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Lazada Link</span>
            <input
              className="facebook-connect-input"
              value={form.lazadaLink}
              onChange={(event) =>
                updateField("lazadaLink", event.target.value)
              }
              placeholder="Optional"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Fallback Mode</span>
            <select
              className="facebook-connect-select"
              value={form.fallbackMode}
              onChange={(event) =>
                updateField("fallbackMode", event.target.value)
              }
            >
              <option value="booking_and_handoff">Booking + Human Handoff</option>
              <option value="booking_only">Booking Only</option>
              <option value="handoff_only">Human Handoff Only</option>
              <option value="safe_reply_only">Safe Reply Only</option>
            </select>
          </label>

          <div className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">AI Controls</span>

            <div className="facebook-connect-grid">
              {[
                ["aiEnabled", "Enable AI replies"],
                ["faqEnabled", "Use approved FAQs"],
                ["suggestionsEnabled", "Create FAQ suggestions"],
                ["humanHandoffEnabled", "Allow human handoff"],
                ["ownerNotificationEnabled", "Notify owner on unknown questions"],
              ].map(([field, label]) => (
                <label key={field} className="facebook-connect-alert">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field])}
                    onChange={(event) =>
                      updateField(field, event.target.checked)
                    }
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
