from frappe.utils.data import slug
from erpnext.setup.doctype.item_group.item_group import ItemGroup


class CustomItemGroup(ItemGroup):
    def validate(self):
        if not self.custom_route:
            clean_name = self.item_group_name.replace("/", " ")
            self.custom_route = "/shop/" + slug(clean_name)
