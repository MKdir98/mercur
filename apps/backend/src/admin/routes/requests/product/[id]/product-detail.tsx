import { Link, useNavigate } from "react-router-dom";
import { TwoColumnLayout } from "../../../../layouts/TwoColumnLayout";
import { SectionRow } from "../../components/section-row";
import { Badge, Button, Container, Heading, Table } from "@medusajs/ui";
import { useVendorRequest } from "../../../../hooks/api/requests";
import { ProductDTO } from "@medusajs/framework/types";
import { useProductCategory } from "../../../../hooks/api/product_category";
import { useProduct } from "../../../../hooks/api/product";
import { useState } from "react";
import { ResolveRequestPrompt } from "../../components/resolve-request";
import { LoadingSpinner } from "../../../../common/LoadingSpinner";
import { Thumbnail } from "../../../../components/thumbnail/thumbnail";

export const ProductRequestDetail = ({ id }: { id: string }) => {
  const navigate = useNavigate();
  const { request, isError, isLoading } = useVendorRequest(id!);

  const isUpdateRequest = request?.type === "product_update";
  const productId = (request?.data as any)?.product_id ?? "";

  const {
    product: fetchedProduct,
    isLoading: isProductLoading,
  } = useProduct(productId, undefined, { enabled: isUpdateRequest && !!productId });

  const requestData = (isUpdateRequest ? fetchedProduct : request?.data) as ProductDTO;

  const [promptOpen, setPromptOpen] = useState(false);
  const [requestAccept, setRequestAccept] = useState(false);

  const handlePrompt = (_: string, accept: boolean) => {
    setRequestAccept(accept);
    setPromptOpen(true);
  };

  if (!request || isLoading || isError) {
    return <LoadingSpinner />;
  }

  if (isUpdateRequest && (isProductLoading || !fetchedProduct)) {
    return <LoadingSpinner />;
  }

  return (
    <TwoColumnLayout
      firstCol={
        <>
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading>{requestData.title}</Heading>
              <ResolveRequestPrompt
                close={() => {
                  setPromptOpen(false);
                }}
                open={promptOpen}
                id={request.id!}
                accept={requestAccept}
                onSuccess={() => {
                  close();
                  navigate("/requests/product");
                }}
              />
              <div className="flex items-center gap-x-4">
                <Button
                  onClick={() => {
                    handlePrompt(id, true);
                  }}
                >
                  Accept
                </Button>
                <Button
                  onClick={() => {
                    handlePrompt(id, false);
                  }}
                  variant="danger"
                >
                  Reject
                </Button>
              </div>
            </div>

            <SectionRow title="Description" value={requestData.description} />
            <SectionRow title="Subtitle" value={requestData.subtitle} />
            <SectionRow
              title="Handle"
              value={requestData.handle ? `/${requestData.handle}` : "-"}
            />
            <SectionRow
              title="Discountable"
              value={requestData.discountable ? "True" : "False"}
            />
          </Container>
          <ProductMediaInfo product={requestData} />
          <ProductOptionsInfo product={requestData} />
          <ProductVariantInfo product={requestData} />
        </>
      }
      secondCol={
        <>
          <ProductOrganizationInfo product={requestData} />
          <ProductAttributeInfo product={requestData} />
        </>
      }
    />
  )
};

const ProductMediaInfo = ({ product }: { product: ProductDTO }) => {
  const allImages = [
    ...(product.thumbnail ? [{ id: "thumbnail", url: product.thumbnail }] : []),
    ...(product.images?.filter((img) => img.url !== product.thumbnail) ?? []),
  ];

  if (!allImages.length) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Media</Heading>
      </div>
      <div className="flex flex-wrap gap-3 px-6 py-4">
        {allImages.map((img) => (
          <Thumbnail key={img.id} src={img.url} size="large" />
        ))}
      </div>
    </Container>
  );
};

const ProductOptionsInfo = ({ product }: { product: ProductDTO }) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Options</Heading>
      </div>

      {product.options?.map((option) => {
        return (
          <SectionRow
            title={option.title}
            key={option.title}
            value={option.values?.map((val) => {
              return (
                <Badge
                  key={`${option.title}-${val.value}`}
                  size="2xsmall"
                  className="flex min-w-[20px] items-center justify-center"
                >
                  {val.value}
                </Badge>
              );
            })}
          />
        );
      })}
    </Container>
  );
};

const ProductVariantInfo = ({ product }: { product: ProductDTO }) => {
  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Variants</Heading>
        </div>
      </div>
      <div className="flex size-full flex-col overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {product.variants?.map((v) => {
              return (
                <Table.Row key={v.title}>
                  <Table.Cell>{v.title || "-"}</Table.Cell>
                  <Table.Cell>{v.sku || "-"}</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </Container>
  );
};

const ProductOrganizationInfo = ({ product }: { product: ProductDTO }) => {
  const category_id = product.categories?.[0]?.id ?? "";
  const { product_category } = useProductCategory(category_id, {
    enabled: !!category_id,
  });
  const category_name = product_category?.name ?? "";

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Organization</Heading>
      </div>

      <SectionRow
        title={"Category"}
        value={
          category_name ? (
            <Badge key={category_id} className="w-fit" size="2xsmall" asChild>
              <Link to={`/categories/${category_id}`}>{category_name}</Link>
            </Badge>
          ) : undefined
        }
      />
    </Container>
  );
};

const ProductAttributeInfo = ({ product }: { product: ProductDTO }) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Attributes</Heading>
      </div>
      <SectionRow title={"Height (cm)"} value={product.height} />
      <SectionRow title={"Width (cm)"} value={product.width} />
      <SectionRow title={"Length (cm)"} value={product.length} />
      <SectionRow title={"Weight (g)"} value={product.weight} />
    </Container>
  );
};
