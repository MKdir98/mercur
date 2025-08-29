import { useState } from "react";
import {
  Button,
  Drawer,
  Input,
  Label,
  toast,
} from "@medusajs/ui";
import { useCreateCity } from "../../../hooks/api/cities";

interface CreateCityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCityDrawer = ({ open, onOpenChange }: CreateCityDrawerProps) => {
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  
  const { mutateAsync: createCity, isPending } = useCreateCity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !countryCode.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (countryCode.length !== 2) {
      toast.error("Country code must be 2 characters");
      return;
    }

    try {
      await createCity({
        name: name.trim(),
        country_code: countryCode.trim().toUpperCase(),
      });
      
      toast.success("City created successfully");
      setName("");
      setCountryCode("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create city");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Create City</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">City Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter city name"
                required
              />
            </div>
            <div>
              <Label htmlFor="country_code">Country Code</Label>
              <Input
                id="country_code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="US, GB, FR..."
                maxLength={2}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create City"}
              </Button>
            </div>
          </form>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  );
}; 