CREATE ROLE tango2 LOGIN ENCRYPTED PASSWORD 'md5d2d0681e998968c98e3c47049f2754fe'
  CREATEDB REPLICATION
   VALID UNTIL 'infinity';

CREATE DATABASE tango2
  WITH ENCODING='UTF8'
       OWNER=tango2
       CONNECTION LIMIT=-1;

-- Table: sites

-- DROP TABLE sites;

CREATE TABLE sites
(
  id bigint NOT NULL,
  code character varying(128) NOT NULL,
  access integer DEFAULT 0,
  description text,
  created bigint,
  CONSTRAINT pk_sites PRIMARY KEY (id )
)
WITH (
  OIDS=FALSE
);
ALTER TABLE sites
  OWNER TO tango2;

-- Table: tokens

-- DROP TABLE tokens;

CREATE TABLE tokens
(
  id bigint NOT NULL,
  token character varying(128) NOT NULL,
  created bigint,
  status integer NOT NULL DEFAULT 0,
  owner character varying(512),
  accessed bigint,
  site_id bigint,
  client character varying(128),
  CONSTRAINT pk_tokens PRIMARY KEY (id ),
  CONSTRAINT fk_token_site FOREIGN KEY (site_id)
      REFERENCES sites (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
)
WITH (
  OIDS=FALSE
);
ALTER TABLE tokens
  OWNER TO tango2;

-- Table: history

-- DROP TABLE history;

CREATE TABLE history
(
  id bigint NOT NULL,
  site_id bigint,
  client character varying(128),
  created bigint,
  operation integer DEFAULT 0,
  document_id character varying(32),
  CONSTRAINT pk_history PRIMARY KEY (id ),
  CONSTRAINT fk_history_sites FOREIGN KEY (site_id)
      REFERENCES sites (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
)
WITH (
  OIDS=FALSE
);
ALTER TABLE history
  OWNER TO tango2;

ALTER TABLE history
   ADD COLUMN version character varying(32);

ALTER TABLE history
   ADD COLUMN from_version character varying(32);

ALTER TABLE history
   ADD COLUMN history_id character varying(32);


-- Table: documents

-- DROP TABLE documents;

CREATE TABLE documents
(
  id bigint NOT NULL,
  document_id character varying(32),
  site_id bigint,
  version character varying(32),
  title text,
  body text,
  status integer DEFAULT 0,
  created bigint,
  updated bigint,
  CONSTRAINT pk_documents PRIMARY KEY (id ),
  CONSTRAINT fk_documents_sites FOREIGN KEY (site_id)
      REFERENCES sites (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
)
WITH (
  OIDS=FALSE
);
ALTER TABLE documents
  OWNER TO tango2;
