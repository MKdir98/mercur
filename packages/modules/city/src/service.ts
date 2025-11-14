import { MedusaService } from "@medusajs/framework/utils";
import { City } from "./models/city";
import { State } from "./models/state";
import { PostexCityMapping } from "./models/postex-city-mapping";

class CityModuleService extends MedusaService({
  City,
  State,
  PostexCityMapping,
}) {
  /**
   * Normalize Persian text for comparison
   * - Trim whitespace
   * - Remove extra spaces
   * - Convert to lowercase for case-insensitive comparison
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
  }

  /**
   * Find state by name (Persian)
   */
  async findStateByName(stateName: string, countryCode: string = 'ir'): Promise<any | null> {
    if (!stateName) {
      return null
    }

    const normalized = this.normalizeText(stateName)
    
    try {
      const states = await this.listStates({
        country_code: countryCode
      })

      // Find exact match (normalized)
      const match = states.find(s => 
        this.normalizeText(s.name) === normalized
      )

      return match || null
    } catch (error) {
      console.error('Error finding state by name:', error)
      return null
    }
  }

  /**
   * Find city by name within a specific state
   */
  async findCityByName(cityName: string, stateId: string): Promise<any | null> {
    if (!cityName || !stateId) {
      return null
    }

    const normalized = this.normalizeText(cityName)

    try {
      const cities = await this.listCities({
        state_id: stateId
      })

      // Find exact match (normalized)
      const match = cities.find(c => 
        this.normalizeText(c.name) === normalized
      )

      return match || null
    } catch (error) {
      console.error('Error finding city by name:', error)
      return null
    }
  }

  /**
   * Get Postex city and province codes by names
   * Returns both codes or nulls if not found
   */
  async getPostexCodes(
    cityName: string, 
    provinceName: string, 
    countryCode: string = 'ir'
  ): Promise<{
    city_code: string | null
    province_code: string | null
    state_id: string | null
  }> {
    console.log('🔍 [CITY_SERVICE] Looking up Postex codes:', { cityName, provinceName, countryCode })

    try {
      // Find state first
      const state = await this.findStateByName(provinceName, countryCode)
      
      if (!state) {
        console.warn('⚠️  [CITY_SERVICE] State not found:', provinceName)
        return {
          city_code: null,
          province_code: null,
          state_id: null
        }
      }

      console.log('✅ [CITY_SERVICE] State found:', {
        id: state.id,
        name: state.name,
        postex_code: state.postex_province_code
      })

      // Find city within state
      const city = await this.findCityByName(cityName, state.id)
      
      if (!city) {
        console.warn('⚠️  [CITY_SERVICE] City not found:', cityName, 'in state:', state.name)
        return {
          city_code: null,
          province_code: state.postex_province_code || null,
          state_id: state.id
        }
      }

      console.log('✅ [CITY_SERVICE] City found:', {
        id: city.id,
        name: city.name,
        postex_code: city.postex_city_code
      })

      return {
        city_code: city.postex_city_code || null,
        province_code: state.postex_province_code || null,
        state_id: state.id
      }
    } catch (error) {
      console.error('❌ [CITY_SERVICE] Error getting Postex codes:', error)
      return {
        city_code: null,
        province_code: null,
        state_id: null
      }
    }
  }

  async getCityById(cityId: string): Promise<any | null> {
    try {
      const [city] = await this.listCities({
        id: cityId
      }, { select: ["id", "name", "postex_city_code", "state_id"] })
      return city || null
    } catch (error) {
      console.error('❌ [CITY_SERVICE] Error retrieving city:', error)
      return null
    }
  }

  async getStateById(stateId: string): Promise<any | null> {
    try {
      const [state] = await this.listStates({
        id: stateId
      })
      return state || null
    } catch (error) {
      console.error('❌ [CITY_SERVICE] Error retrieving state:', error)
      return null
    }
  }
}

export default CityModuleService; 