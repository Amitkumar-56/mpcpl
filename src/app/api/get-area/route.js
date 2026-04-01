import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { lat, lng } = await request.json();

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, message: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Using Nominatim API for reverse geocoding (free and open source)
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'MPCPL Filling Requests System' // Required by Nominatim
      }
    });

    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json(
        { success: false, message: 'Unable to find area for given coordinates' },
        { status: 404 }
      );
    }

    // Extract area information
    let areaName = '';
    const address = data.address || {};
    
    // Try to get the most specific area name available
    if (address.suburb || address.neighbourhood || address.residential || address.hamlet) {
      areaName = address.suburb || address.neighbourhood || address.residential || address.hamlet;
    } else if (address.city_district || address.district) {
      areaName = address.city_district || address.district;
    } else if (address.city || address.town || address.village) {
      areaName = address.city || address.town || address.village;
    } else if (address.county) {
      areaName = address.county;
    } else {
      areaName = data.display_name?.split(',')[0] || 'Unknown Area';
    }

    // Get additional location details
    const locationDetails = {
      area_name: areaName,
      full_address: data.display_name,
      city: address.city || address.town || '',
      state: address.state || '',
      pincode: address.postcode || '',
      country: address.country || ''
    };

    return NextResponse.json({
      success: true,
      area_name: areaName,
      location_details: locationDetails,
      raw_data: data
    });

  } catch (error) {
    console.error('Error getting area from coordinates:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get area information' },
      { status: 500 }
    );
  }
}
