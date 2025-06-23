from frappe.utils.data import slug
from erpnext.stock.doctype.item.item import Item


class CustomItem(Item):
    def validate(self):
        super().validate()

        if not self.custom_route:
            clean_group = self.item_group.replace("/", " ")
            clean_name = self.item_name.replace("/", " ")

            self.custom_route = "/shop/" + slug(clean_group) + "/" + slug(clean_name)
