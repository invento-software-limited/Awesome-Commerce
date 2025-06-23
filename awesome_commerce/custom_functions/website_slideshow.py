import frappe
from frappe.website.doctype.website_slideshow.website_slideshow import WebsiteSlideshow

class CustomWebsiteSlideshow(WebsiteSlideshow):
    def validate(self):
        super().validate()

        if self.custom_show_in:
            existing = frappe.db.exists(
                "Website Slideshow",
                {
                    "custom_show_in": self.custom_show_in,
                    "name": ["!=", self.name]
                }
            )

            if existing:
                frappe.throw(f"A slideshow with '{self.custom_show_in}' already exists. Please choose a different value.")
