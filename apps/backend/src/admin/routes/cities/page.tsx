import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Container,
  Heading,
  Button,
  DataTable,
  useDataTable,
  DataTablePaginationState,
} from "@medusajs/ui";
import { MapPin } from "@medusajs/icons";
import { useState } from "react";
import { SingleColumnLayout } from "../../layouts/single-column";
import { useCities } from "../../hooks/api/cities";
import { CreateCityDrawer } from "./components/create-city-drawer";

const CitiesPage = () => {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const pageSize = 20;

  const { cities, count, isLoading } = useCities({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "country_code",
      header: "Country Code",
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ getValue }: any) => {
        const value = getValue()
        return value ? new Date(value).toLocaleDateString() : "-"
      },
    },
  ]

  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: page - 1,
    pageSize,
  });

  const [search, setSearch] = useState("");

  const table = useDataTable({
    columns,
    data: cities || [],
    getRowId: (city: any) => city.id,
    rowCount: count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: (newPagination) => {
        setPagination(newPagination);
        setPage(newPagination.pageIndex + 1);
      },
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
  });

  return (
    <SingleColumnLayout>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>Cities</Heading>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            Create City
          </Button>
        </div>
        <div>
          <DataTable instance={table}>
            <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
              <DataTable.Search placeholder="Search cities..." />
            </DataTable.Toolbar>
            <DataTable.Table />
            <DataTable.Pagination />
          </DataTable>
        </div>
      </Container>
      
      <CreateCityDrawer 
        open={createOpen} 
        onOpenChange={setCreateOpen}
      />
    </SingleColumnLayout>
  );
};

export const config = defineRouteConfig({
  label: "Cities",
  icon: MapPin,
});

export default CitiesPage; 