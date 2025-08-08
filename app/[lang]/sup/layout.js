// app/[lang]/admin/layout.js
import Breadcrumbs from "@/components/navs/Breadcrumbs";

export default function SupLayout({ children }) {
    return (
        <div className="mx-auto">
            <Breadcrumbs />
            {children}
        </div>
    )
}