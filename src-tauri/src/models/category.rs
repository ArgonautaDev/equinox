//! Category Model

use serde::{Deserialize, Serialize};

/// Category entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub tenant_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a category
#[derive(Debug, Deserialize)]
pub struct CreateCategoryDto {
    pub parent_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

/// DTO for updating a category
#[derive(Debug, Deserialize)]
pub struct UpdateCategoryDto {
    pub parent_id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

/// Category filters
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryFilters {
    pub search: Option<String>,
    pub parent_id: Option<String>,
    pub is_active: Option<bool>,
}
